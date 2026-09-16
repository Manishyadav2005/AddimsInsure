import { Router } from "express";
import authRouter from "./auth";
import superadminRouter from "./superadmin";
import operatorsRouter from "./operators";
import teamRouter from "./team";
import leadsRouter from "./leads";
import customersRouter from "./customers";
import followupsRouter from "./followups";
import reportsRouter from "./reports";
import auditRouter from "./audit";
import policiesRouter from "./policies";
import emailsRouter from "./emails";
import settingsRouter from "./settings";
import companiesRouter from "./companies";
import contestsRouter from "./contests";
import revenueRouter from "./revenue";
import aiRouter from "./ai";
import agencyProfileRouter from "./agencyProfile";
import performanceRouter from "./performance";
import highlightsRouter from "./highlights";
import advisorsRouter from "./advisors";


import { PolicyModel, Lead, Customer, FollowUp, CallLog, BranchManager, TeamLeader, Caller, ContestModel, EmailLogModel, PerformanceTargetModel } from "../models";

const router = Router();

// Master Clear All Dummy Data Endpoint
router.post("/clear-database", async (req, res) => {
  try {
    const p = await PolicyModel.deleteMany({});
    const l = await Lead.deleteMany({});
    const c = await Customer.deleteMany({});
    const f = await FollowUp.deleteMany({});
    const cl = await CallLog.deleteMany({});
    const bm = await BranchManager.deleteMany({});
    const tl = await TeamLeader.deleteMany({});
    const tse = await Caller.deleteMany({});
    const ct = await ContestModel.deleteMany({});
    const em = await EmailLogModel.deleteMany({});
    const pt = await PerformanceTargetModel.deleteMany({});

    res.json({
      success: true,
      message: "All dummy data deleted from MongoDB Atlas successfully!",
      deleted: {
        policies: p.deletedCount,
        leads: l.deletedCount,
        customers: c.deletedCount,
        followups: f.deletedCount,
        callLogs: cl.deletedCount,
        branchManagers: bm.deletedCount,
        teamLeaders: tl.deletedCount,
        tses: tse.deletedCount,
        contests: ct.deletedCount,
        emails: em.deletedCount,
        performanceTargets: pt.deletedCount
      }
    });
  } catch (err: any) {
    console.error("Clear Database Error:", err);
    res.status(500).json({ error: err.message || "Failed to clear database" });
  }
});

router.use("/auth", authRouter);
router.use("/superadmin", superadminRouter);
router.use("/operators", operatorsRouter);
router.use("/team", teamRouter);
router.use("/leads", leadsRouter);
router.use("/customers", customersRouter);
router.use("/followups", followupsRouter);
router.use("/reports", reportsRouter);
router.use("/audit", auditRouter);
router.use("/policies", policiesRouter);
router.use("/emails", emailsRouter);
router.use("/settings", settingsRouter);
router.use("/companies", companiesRouter);
router.use("/contests", contestsRouter);
router.use("/revenue", revenueRouter);
router.use("/agency-profile", agencyProfileRouter);
router.use("/performance", performanceRouter);
router.use("/highlights", highlightsRouter);
router.use("/advisors", advisorsRouter);
router.use("/", aiRouter);



export default router;
