import mongoose, { Schema, Document } from "mongoose";

export interface IFamilyMember {
  name: string;
  relationship: string;
  dob?: string;
  gender?: string;
  healthStatus?: string;
  notes?: string;
}

export interface IHealthDetails {
  generalHealth?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  existingConditions?: string;
  previousSurgeries?: string;
  currentMedications?: string;
  smokingStatus?: string;
  alcoholStatus?: string;
  disability?: string;
  healthNotes?: string;
}

export interface ICustomer extends Document {
  id: string;
  tenantId?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  callerId?: string;
  callerName?: string;
  assignedTo?: string;
  assignedToName?: string;
  customerName: string;
  customerPhone?: string;
  alternatePhone?: string;
  customerEmail?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed";
  anniversaryDate?: string;
  occupation?: string;
  
  // Full Address
  houseFlat?: string;
  streetArea?: string;
  landmark?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;

  // Extended Details
  familyMembers?: IFamilyMember[];
  healthDetails?: IHealthDetails;

  source?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tenantId: { type: String, index: true },
    teamLeaderId: { type: String, index: true },
    teamLeaderName: { type: String },
    callerId: { type: String, index: true },
    callerName: { type: String },
    assignedTo: { type: String, index: true },
    assignedToName: { type: String },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    alternatePhone: { type: String },
    customerEmail: { type: String },
    dob: { type: String },
    gender: { type: String },
    maritalStatus: { type: String, enum: ["Single", "Married", "Divorced", "Widowed"], default: "Single" },
    anniversaryDate: { type: String },
    occupation: { type: String },

    houseFlat: { type: String },
    streetArea: { type: String },
    landmark: { type: String },
    address: { type: String },
    city: { type: String },
    district: { type: String },
    state: { type: String },
    pincode: { type: String },

    familyMembers: {
      type: [
        {
          name: { type: String },
          relationship: { type: String },
          dob: { type: String },
          gender: { type: String },
          healthStatus: { type: String },
          notes: { type: String }
        }
      ],
      default: []
    },

    healthDetails: {
      generalHealth: { type: String },
      bloodGroup: { type: String },
      height: { type: String },
      weight: { type: String },
      existingConditions: { type: String },
      previousSurgeries: { type: String },
      currentMedications: { type: String },
      smokingStatus: { type: String },
      alcoholStatus: { type: String },
      disability: { type: String },
      healthNotes: { type: String }
    },

    source: { type: String, default: "Lead Conversion" },
    notes: { type: String },
    createdBy: { type: String },
    createdByName: { type: String },
    updatedBy: { type: String },
    updatedByName: { type: String }
  },
  { timestamps: true }
);

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
