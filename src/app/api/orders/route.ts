import { NextResponse } from "next/server";
import { generateOrderNumber } from "@/lib/utils/order-number";
import { createOrderSchema } from "@/lib/validations/orders";
import { logger } from "@/lib/utils/logger";
import { requireAuth } from "@/lib/auth/server";
import { isAuthError, isErrorWithStatus, formatApiError } from "@/lib/types/api-errors";
import { getRazorpayService } from "@/lib/services/razorpay";
import { getRazorpayRouteService } from "@/lib/services/razorpay-route";
import { emailService } from "@/lib/services/email";
import { getSupabaseServiceClient, createSupabaseServerClientWithRequest } from "@/lib/supabase/client";
import { getNimbusService } from "@/lib/services/nimbus";
import { calculateOrderWeight } from "@/lib/utils/order-helpers";

/**
 * Orders API
 * Swiggy Dec 2025 pattern: No dev fallbacks, strict auth, real database integration.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const customerId = user.id;

    // Swiggy Dec 2025 pattern: Use regular client for authenticated requests - RLS handles access control
    const supabase = await createSupabaseServerClientWithRequest(request);
    if (!supabase) {
      logger.error("[Orders API] Supabase client not available");
      return NextResponse.json(
        { error: "Service temporarily unavailable", code: "DATABASE_UNAVAILABLE" },
        { status: 503 }
      );
    }

    // Swiggy Dec 2025 pattern: Select specific fields to reduce payload size
    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_id, vendor_id, status, items, item_total, delivery_fee, platform_fee, cashback_used, total, delivery_type, delivery_address, payment_id, payment_status, created_at, updated_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[Orders API] Failed to fetch orders", error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const formattedOrders = (dbOrders || []).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      vendorId: order.vendor_id,
      status: order.status,
      items: Array.isArray(order.items) ? order.items : [],
      itemTotal: parseFloat(order.item_total || "0"),
      deliveryFee: parseFloat(order.delivery_fee || "0"),
      platformFee: parseFloat(order.platform_fee || "0"),
      cashbackUsed: parseFloat(order.cashback_used || "0"),
      total: parseFloat(order.total || "0"),
      deliveryType: order.delivery_type,
      deliveryAddress: order.delivery_address,
      paymentId: order.payment_id,
      paymentStatus: order.payment_status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    logger.error("[Orders API] Critical failure", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const customerId = user.id;

    const body = await request.json();
    const validationResult = createOrderSchema.safeParse({ ...body, customerId });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      logger.error("[Orders API] Supabase client not available");
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const orderNumber = generateOrderNumber();
    const itemTotal = validatedData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = itemTotal + validatedData.deliveryFee + validatedData.platformFee - validatedData.cashbackUsed;

    const { data: vendor } = await supabase
      .from("vendors")
      .select("razorpay_account_id, name, store_address, city, user_id, users(phone)")
      .eq("id", validatedData.vendorId)
      .single();

    const { data: newOrder, error: insertError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        vendor_id: validatedData.vendorId,
        status: "pending",
        items: validatedData.items,
        item_total: itemTotal.toString(),
        delivery_fee: validatedData.deliveryFee.toString(),
        platform_fee: validatedData.platformFee.toString(),
        cashback_used: validatedData.cashbackUsed.toString(),
        total: total.toString(),
        delivery_type: validatedData.deliveryType,
        delivery_address: validatedData.deliveryAddress,
        payment_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    let paymentId: string | null = null;
    try {
      const razorpayService = getRazorpayService();
      const amountInPaise = Math.round(total * 100);
      
      const payment = await razorpayService.createPayment({
        amount: amountInPaise,
        currency: "INR",
        orderId: newOrder.id,
        customerId: user.id,
        customerPhone: user.phone,
        notes: { order_number: orderNumber, vendor_id: validatedData.vendorId },
      });

      paymentId = payment.id;
      await supabase.from("orders").update({ payment_id: paymentId }).eq("id", newOrder.id);

      if (vendor?.razorpay_account_id) {
        try {
          const razorpayRouteService = getRazorpayRouteService();
          const splitResult = await razorpayRouteService.splitPayment({
            orderId: newOrder.id,
            paymentId: payment.id,
            totalAmount: amountInPaise,
            vendorAccountId: vendor.razorpay_account_id,
          });

          await supabase
            .from("orders")
            .update({
              razorpay_route_id: splitResult.razorpayRouteId,
              commission_amount: (splitResult.wyshkitAmount / 100).toString(),
              vendor_amount: (splitResult.vendorAmount / 100).toString(),
            })
            .eq("id", newOrder.id);
        } catch (splitError) {
          logger.error("[Orders API] Split payment failed", splitError);
        }
      }
    } catch (paymentError) {
      logger.error("[Orders API] Payment creation failed", paymentError);
    }

    // Create Nimbus delivery after order creation
    if (validatedData.deliveryType === 'local' || validatedData.deliveryType === 'intercity') {
      try {
        const nimbusService = getNimbusService();
        
        // Extract pincode from store address if available (format: "Address, City, Pincode")
        const storePincode = vendor?.store_address?.match(/\b\d{6}\b/)?.[0] || '';
        
        // Get vendor phone from users table
        const vendorPhone = (vendor as any)?.users?.phone || '';
        
        const deliveryRequest = {
          orderId: newOrder.id,
          pickupAddress: {
            name: vendor?.name || 'Vendor',
            phone: vendorPhone,
            address: vendor?.store_address || '',
            city: vendor?.city || '',
            pincode: storePincode,
          },
          deliveryAddress: {
            name: validatedData.deliveryAddress.name,
            phone: validatedData.deliveryAddress.phone || user.phone,
            address: validatedData.deliveryAddress.address,
            city: validatedData.deliveryAddress.city,
            pincode: validatedData.deliveryAddress.pincode,
          },
          weight: calculateOrderWeight(validatedData.items),
          type: validatedData.deliveryType,
        };

        const deliveryResult = await nimbusService.createDelivery(deliveryRequest);
        
        // Update order with delivery info
        await supabase.from("orders").update({
          delivery_partner_id: deliveryResult.partnerId,
          estimated_delivery: deliveryResult.estimatedTime,
        }).eq("id", newOrder.id);
        
        logger.info("[Orders API] Nimbus delivery created", { 
          orderId: newOrder.id, 
          deliveryId: deliveryResult.deliveryId 
        });
      } catch (nimbusError) {
        logger.error("[Orders API] Nimbus delivery creation failed", nimbusError);
        // Don't fail order creation if delivery creation fails
        // Order is already created and payment processed
      }
    }

    // Trigger email confirmation asynchronously
    if (user.email) {
      emailService.sendOrderConfirmation(user.email, orderNumber, newOrder.id, total, validatedData.items.map(i => ({ name: "Custom Gift", quantity: i.quantity, price: i.price })))
        .catch(e => logger.error("[Orders API] Email failed", e));
    }

    return NextResponse.json({
      orderId: newOrder.id,
      orderNumber: newOrder.order_number,
      status: newOrder.status,
      total,
      paymentId,
    });
  } catch (error: unknown) {
    if (isAuthError(error) || (isErrorWithStatus(error) && error.status === 401)) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    
    logger.error("[Orders API] Post failure", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to create order. Please try again.", 
        code: "ORDER_CREATE_FAILED",
        ...(process.env.NODE_ENV === "development" && { 
          details: error instanceof Error ? error.message : String(error) 
        }),
      },
      { status: 500 }
    );
  }
}
