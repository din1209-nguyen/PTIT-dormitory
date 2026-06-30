export interface Building {
  _id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  stats?: { floorCount: number; roomCount: number; bedCount: number; activeBedCount: number; occupiedBedCount: number };
}

export interface Floor {
  _id: string;
  buildingId: string;
  floorNumber: number;
  description?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  stats?: { roomCount: number; bedCount: number; activeBedCount: number; occupiedBedCount: number };
}

export interface Room {
  _id: string;
  floorId: string;
  roomNumber: string;
  capacity: number;
  genderType: 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  isFreshmanPriority: boolean;
  stats?: { bedCount: number; activeBedCount: number; occupiedBedCount: number; currentResidentCount?: number };
}

export interface Bed {
  _id: string;
  roomId: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'BROKEN';
}
