export interface UtilityUsage {
  _id: string;
  roomId: { _id: string; roomNumber: string; floorId?: { _id: string; floorNumber: number; buildingId?: { _id: string; name: string } } } | string;
  month: number;
  year: number;
  oldElectricity: number;
  newElectricity: number;
  oldWater: number;
  newWater: number;
  recordedBy?: { _id: string; fullName: string } | string;
  recordedAt: string;
}

export interface UtilityBill {
  _id: string;
  roomId: { _id: string; roomNumber: string; floorId?: { _id: string; floorNumber: number; buildingId?: { _id: string; name: string } } } | string;
  semesterId?: { _id: string; name: string } | string;
  month: number;
  year: number;
  electricityUsage: number;
  waterUsage: number;
  electricityCost: number;
  waterCost: number;
  vatAmount: number;
  totalCost: number;
  status: 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paymentDate?: string;
  priceConfigSnapshot?: Record<string, unknown>;
  roomMemberSnapshot?: Array<{ studentId: string; studentCode: string; fullName: string }>;
  createdAt: string;
  members?: UtilityBillMember[];
}

export interface UtilityBillMember {
  _id: string;
  billId: UtilityBill | string;
  studentId: { _id: string; studentCode: string; fullName: string } | string;
  amountShare: number;
  status: 'UNPAID' | 'PAID' | 'WAIVED';
  paidAt?: string;
}

export interface Payment {
  _id: string;
  billId: string;
  studentId?: { _id: string; studentCode: string; fullName: string } | string;
  method: 'VNPAY' | 'CASH';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  vnpTxnRef?: string;
  paidAt?: string;
  cashConfirmedBy?: { _id: string; fullName: string } | string;
  createdAt: string;
}

export interface ElectricPriceTier {
  _id: string;
  tierOrder: number;
  fromKwh: number;
  toKwh: number | null;
  unitPrice: number;
  isActive: boolean;
}
