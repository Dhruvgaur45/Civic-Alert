export interface LocationDto {
  lat: number;
  lng: number;
  address: string;
}

export interface CivicReport {
  id: string;
  category: string; // Pothole | Garbage | Streetlight | Water Leakage | Public Complaint | Other
  description: string;
  image: string; // Base64 content or empty
  location: LocationDto;
  status: 'New' | 'In Progress' | 'Resolved' | 'Reopened';
  priority: 'Low' | 'Medium' | 'High';
  isRepeated: boolean;
  repeatedCount: number;
  createdAt: string;
}

export interface DeviceDto {
  id: string;
  label: string;
  connectedAt: string;
}

export type ViewType = 
  | 'home'
  | 'report'
  | 'connect'
  | 'login'
  | 'admin'
  | 'detail';
