export interface Payment {
  id: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  status: 'Pending' | 'Reviewing' | 'Completed' | 'Failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentDate?: Date;
  platformFee?: number;
  clientId?: string;
  freelancerId?: string;
  projectId?: string;
}

export interface PaymentSummary {
  totalSpent: number;
  pendingPayments: number;
  completedPayments: number;
  totalPayments: number;
  totalAmount?: number;
  totalEarnings?: number;
}

