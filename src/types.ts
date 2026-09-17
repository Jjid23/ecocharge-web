export type Role = 'user' | 'admin';

export type BottleSize = 'small' | 'medium' | 'large';

export type DetectionStatus = 'Detected' | 'Verified' | 'Rejected';

export type PortStatus = 'Available' | 'In Use' | 'Maintenance' | 'Disabled';

export type SessionStatus = 'Active' | 'Completed' | 'Stopped';

export type PointTransactionType = 'Earned' | 'Deducted' | 'Admin Bonus' | 'Refund';

export interface User {
  userId: string;
  fullName: string;
  username: string;
  email: string;
  currentPoints: number;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface BottleTransaction {
  transactionId: string;
  userId: string;
  userFullName?: string;
  bottleSize: BottleSize;
  bottleType: string;
  quantity: number;
  pointsEarned: number;
  detectionStatus: DetectionStatus;
  detectedAt: string;
  confidenceScore?: number;
}

export interface ChargingPort {
  portId: string;
  portNumber: number;
  portStatus: PortStatus;
  connectorType: string;
  updatedAt: string;
  currentUserId?: string;
  currentSessionId?: string;
}

export interface ChargingSession {
  sessionId: string;
  userId: string;
  userFullName?: string;
  portId: string;
  portNumber: number;
  connectorType?: string;
  durationMinutes: number;
  pointsUsed: number;
  startTime: string;
  endTime: string;
  sessionStatus: SessionStatus;
  remainingSeconds?: number;
}

export interface PointTransaction {
  pointTransactionId: string;
  userId: string;
  transactionType: PointTransactionType;
  pointsAdded: number;
  pointsDeducted: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface SystemSettings {
  smallBottlePoints: number;
  mediumBottlePoints: number;
  largeBottlePoints: number;
  durationOptions: Array<{ minutes: number; points: number }>;
  systemMaintenanceMode: boolean;
}

export interface DetectionResult {
  bottleSize: BottleSize;
  bottleType: string;
  confidence: number;
  pointsEarned: number;
  detectedAt: string;
  imagePreviewUrl?: string;
  dimensionsText?: string;
  /** Exact YOLO class label e.g. "500ml", "1000ml" */
  detectedLabel?: string;
}

export interface ImpactStats {
  totalBottlesRecycled: number;
  totalPointsAwarded: number;
  totalChargingSessions: number;
  totalRegisteredUsers: number;
  totalCo2SavedKg: number;
  activePortsCount: number;
  availablePortsCount: number;
}
