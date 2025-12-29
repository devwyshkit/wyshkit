/**
 * Email Service using Resend
 * Swiggy Dec 2025 pattern: Simple, clean email notifications for transactional emails
 * Used for notifications that can't be handled by Supabase (order confirmations, receipts, etc.)
 */

import { logger } from "@/lib/utils/logger";
import { env } from "@/lib/config/env";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service using Resend API
 */
export class EmailService {
  private apiKey: string | null = null;
  private fromEmail: string = "WyshKit <noreply@wyshkit.com>";

  constructor() {
    this.apiKey = env.RESEND_API_KEY || null;
    
    if (!this.apiKey) {
      logger.warn("[Email Service] Resend API key not configured. Email sending will be disabled.");
    }
  }

  /**
   * Send email using Resend API
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.apiKey) {
      logger.warn("[Email Service] Cannot send email: Resend API key not configured");
      return {
        success: false,
        error: "Email service not configured",
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from || this.fromEmail,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        logger.error("[Email Service] Failed to send email", {
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      logger.info("[Email Service] Email sent successfully", { messageId: data.id });

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      logger.error("[Email Service] Error sending email", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(
    email: string,
    orderNumber: string,
    orderId: string,
    total: number,
    items: Array<{ name: string; quantity: number; price: number }>
  ): Promise<EmailResult> {
    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Order Confirmed!</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your order! We've received your order and will start processing it soon.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; font-weight: 600;">Order Number: <span style="color: #667eea;">${orderNumber}</span></p>
              <p style="margin: 0; font-size: 14px; color: #666;">Order ID: ${orderId}</p>
            </div>

            <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px;">Order Details</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: 600; border-top: 2px solid #ddd;">Total:</td>
                  <td style="padding: 12px; text-align: right; font-weight: 600; border-top: 2px solid #ddd;">₹${total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">You can track your order status in your account.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://wyshkit.com"}/orders?orderId=${orderId}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">View Order</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} WyshKit. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Order Confirmed!

Thank you for your order! We've received your order and will start processing it soon.

Order Number: ${orderNumber}
Order ID: ${orderId}

Order Details:
${items.map((item) => `- ${item.name} x${item.quantity} - ₹${item.price.toFixed(2)}`).join("\n")}

Total: ₹${total.toFixed(2)}

You can track your order status in your account.
${process.env.NEXT_PUBLIC_APP_URL || "https://wyshkit.com"}/orders?orderId=${orderId}
    `.trim();

    return this.sendEmail({
      to: email,
      subject: `Order Confirmation - ${orderNumber}`,
      html,
      text,
    });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(
    email: string,
    orderNumber: string,
    status: string,
    message?: string
  ): Promise<EmailResult> {
    const statusMessages: Record<string, { subject: string; title: string; description: string }> = {
      mockup_ready: {
        subject: `Mockup Ready for Order ${orderNumber}`,
        title: "Mockup Ready for Review",
        description: "Your order mockup is ready! Please review and approve it to proceed.",
      },
      crafting: {
        subject: `Order ${orderNumber} is Being Crafted`,
        title: "Your Order is Being Crafted",
        description: "Our artisans have started working on your order. We'll keep you updated on the progress.",
      },
      ready_for_pickup: {
        subject: `Order ${orderNumber} is Ready for Pickup`,
        title: "Your Order is Ready!",
        description: "Your order is ready for pickup. We'll notify you about delivery arrangements soon.",
      },
      out_for_delivery: {
        subject: `Order ${orderNumber} is Out for Delivery`,
        title: "Your Order is on the Way!",
        description: "Your order is out for delivery. You'll receive it soon!",
      },
      delivered: {
        subject: `Order ${orderNumber} has been Delivered`,
        title: "Order Delivered!",
        description: "Your order has been delivered. We hope you love it!",
      },
    };

    const statusInfo = statusMessages[status] || {
      subject: `Order ${orderNumber} Status Update`,
      title: "Order Status Updated",
      description: message || "Your order status has been updated.",
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${statusInfo.title}</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${statusInfo.description}</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-weight: 600;">Order Number: <span style="color: #667eea;">${orderNumber}</span></p>
            </div>

            ${message ? `<p style="font-size: 14px; color: #666; margin-top: 20px;">${message}</p>` : ""}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://wyshkit.com"}/orders?orderId=${orderNumber}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Order</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} WyshKit. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
${statusInfo.title}

${statusInfo.description}

Order Number: ${orderNumber}
${message ? `\n${message}\n` : ""}

View your order: ${process.env.NEXT_PUBLIC_APP_URL || "https://wyshkit.com"}/orders?orderId=${orderNumber}
    `.trim();

    return this.sendEmail({
      to: email,
      subject: statusInfo.subject,
      html,
      text,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();


