# Addims InSure 🛡️
> **Smart Insurance CRM & Policy Management Platform**  
> *Powered by [MS](https://manish.page/)*

Addims InSure is a modern, full-stack Insurance Portfolio & Agency CRM designed for agencies, branch managers, team leaders, and callers. It streamlines insurance policy tracking, fresh & port business, automated renewal alerts, commission & revenue analytics, client birthday management, and multi-tenant agency administration.

---

## 🚀 Key Features

- **Multi-Role RBAC Management**: Super Admin, Tenant Admin, Branch Manager, Team Leader, and Caller/TSE roles with granular permissions.
- **Policy Lifecycle & Ledger**: Comprehensive tracking of Fresh, Renewal, and Port insurance policies.
- **Revenue & Commission Analytics**: Track premium volumes, payout commissions, team targets, and monthly contests.
- **Client Engagement**: Automated dispatch logs for renewal reminders and birthday greetings.
- **Database Architecture**: Powered by MongoDB Atlas cloud database with Mongoose ODM.
- **Modern UI/UX**: Built with React 19, Vite, Tailwind CSS v4, Lucide Icons, and Motion animations.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion
- **Backend**: Node.js, Express, TypeScript, tsx, esbuild
- **Database**: MongoDB Atlas / Mongoose
- **Authentication**: JWT, bcryptjs

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3036
   NODE_ENV="development"
   MONGODB_URI="your_mongodb_connection_string"
   JWT_SECRET="your_jwt_secret_key"
   SUPERADMIN_EMAIL="policy@gmail.com"
   SUPERADMIN_PASSWORD="policy123"
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **Production Build:**
   ```bash
   npm run build
   npm start
   ```
