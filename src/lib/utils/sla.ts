/**
 * SLA (Service Level Agreement) calculation and tracking
 * For vendor mockup upload deadlines
 */

const MOCKUP_SLA_HOURS = 2; // 2 hours to upload mockup after order acceptance
const ACCEPT_ORDER_DEADLINE_MINUTES = 5; // 5 minutes to accept/reject order

/**
 * Calculate mockup SLA deadline
 */
export function calculateMockupSLA(acceptedAt: Date): Date {
  const deadline = new Date(acceptedAt);
  deadline.setHours(deadline.getHours() + MOCKUP_SLA_HOURS);
  return deadline;
}

/**
 * Calculate order accept deadline
 */
export function calculateAcceptDeadline(createdAt: Date): Date {
  const deadline = new Date(createdAt);
  deadline.setMinutes(deadline.getMinutes() + ACCEPT_ORDER_DEADLINE_MINUTES);
  return deadline;
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(deadline: Date): boolean {
  return new Date() > deadline;
}

/**
 * Get time remaining until deadline
 */
export function getTimeRemaining(deadline: Date): {
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
} {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isOverdue: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, isOverdue: false };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(deadline: Date): string {
  const { hours, minutes, isOverdue } = getTimeRemaining(deadline);
  
  if (isOverdue) {
    return "Overdue";
  }

  if (hours > 0) {
    return `${hours} hr ${minutes} min left`;
  }
  return `${minutes} min left`;
}




