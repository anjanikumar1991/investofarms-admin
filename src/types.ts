export type UserRole = 'ADMIN' | 'admin' | 'SUPERVISOR' | 'supervisor' | string;

export interface AdminUser {
  id: number;
  phone?: string;
  full_name?: string;
  role: UserRole;
  kyc_status?: string;
}

export interface AdminUserFull {
  id: number;
  phone?: string;
  email?: string;
  full_name?: string;
  role: string;
  gender?: string;
  kyc_status?: string;
  is_profile_completed: boolean;
  is_kyc_verified: boolean;
}

export interface FarmProject {
  id: number;
  project_name: string;
  description?: string;
  image_url?: string;
  crop_name: string;
  roi_percentage: number;
  risk_level: string;
  harvest_date: string;
  total_plots: number;
  available_plots: number;
  acre_per_plot: number;
  price_per_acre: number;
  status: string;
  // Timeline
  project_start_date?: string;
  project_end_date?: string;
  // Fee structure
  documentation_fee_per_acre?: number;
  farm_manage_fee_per_acre?: number;
  lease_fee_per_acre?: number;
  // Payout
  payout_tenure?: string;
  // Visibility & sales gate
  is_visible: boolean;
  project_sales_start_date?: string;
}

export const PAYOUT_TENURES = ['Monthly', 'Quarterly', 'Half Yearly', 'Annually'];

export interface CropCycle {
  id: number;
  project_id: number;
  crop_name: string;
  crop_type: 'main' | 'intercrop';
  start_date: string;
  end_date: string;
  season_name?: string;
  cycle_year?: number;
  expected_yield?: number;
  expected_yield_unit?: string;
  notes?: string;
  status: string;
  activities?: CropActivity[];
}

export interface CropActivity {
  id: number;
  project_crop_cycle_id: number;
  activity_name: string;
  activity_type?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  priority?: string;
  status: string;
  assigned_to?: string;
  estimated_cost?: number;
  actual_cost?: number;
  remarks?: string;
}

export interface UserProject {
  id: number;
  user_id: number;
  project_id: number;
  plot_size: number;
  total_acres: number;
  cost: number;
  documentation_fee: number;
  status: string;
  created_at: string;
  updated_at: string;
  // enriched
  project_name?: string;
  crop_name?: string;
  image_url?: string;
  user_phone?: string;
  user_name?: string;
}

export interface InvestmentTransaction {
  id: number;
  user_project_id: number;
  user_id: number;
  project_id: number;
  amount: number;
  transaction_type: string;
  status: string;
  upi_reference?: string;
  session_expires_at: string;
  approved_at?: string;
  created_at: string;
  // enriched
  project_name?: string;
  user_phone?: string;
  user_name?: string;
  plot_size?: number;
  total_acres?: number;
}

export interface ProjectPayoutSchedule {
  id: number;
  project_id: number;
  project_name?: string;
  payout_number: number;
  label: string;
  scheduled_date: string;
  expected_amount: number;
  payout_type: string;
}

export interface CustomerPayout {
  id: number;
  user_project_id: number;
  project_id: number;
  project_name?: string;
  user_id: number;
  user_phone?: string;
  user_name?: string;
  schedule_id: number;
  schedule_label?: string;
  scheduled_date?: string;
  amount: number;
  paid_date: string;
  transaction_id: string;
  transaction_type: string;
  notes?: string;
  timing: 'early' | 'on_time' | 'delayed' | string;
}
