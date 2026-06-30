export interface ResidenceReport {
  total: number;
  byGender: Array<{ gender: string; count: number }>;
  byDepartment: Array<{ department: string; count: number }>;
  freshman: number;
  returning: number;
}

export interface CapacityReport {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  byBuilding: Array<{ name: string; totalBeds: number; occupiedBeds: number }>;
}

export interface UtilityReport {
  totalBills: number;
  totalAmount: number;
  totalElectricityCost: number;
  totalWaterCost: number;
  totalVat: number;
  avgElectricityPerRoom: number;
  avgWaterPerRoom: number;
  byStatus: Array<{ status: string; count: number; total: number }>;
}

export interface PaymentReport {
  byMethod: Array<{ method: string; count: number; total: number }>;
  byStatus: Array<{ status: string; count: number; total: number }>;
  collectionRate: number;
  totalCollected: number;
  totalBilled: number;
}

export interface ViolationReport {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  topViolators: Array<{ _id: string; count: number; studentCode?: string; fullName?: string }>;
  byMonth: Array<{ month: number; year: number; count: number }>;
}

export interface RequestReport {
  total: number;
  byType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  avgProcessingHours: number;
}

export interface ManagerDashboard {
  residingStudents: number;
  nonResidingStudents: number;
  occupiedRooms: number;
  pendingBills: number;
  pendingRequests: number;
  recentViolations: number;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  totalPermissions: number;
  recentLogs: number;
}

export interface StudentDashboard {
  currentRoom: string | null;
  unreadNotifications: number;
  unpaidBills: number;
}

export interface TrendReportItem {
  name: string;
  academicYear: string;
  residenceTotal: number;
  occupancyRate: number;
  utilityAmount: number;
  collectionRate: number;
  violationCount: number;
  requestCount: number;
}
