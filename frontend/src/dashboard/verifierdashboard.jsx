import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./verifierdashboard.css";
import { fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint, updateDashboardProfile, markDashboardNotificationRead } from "../utils/dashboardApi";

import MyProfile from "../verifierprofiledashboard/MyProfile";
import NewComplaints from "../verifierprofiledashboard/NewComplaints";
import CompletedWork from "../verifierprofiledashboard/CompletedWork";
import Reverification from "../verifierprofiledashboard/Reverification";
import PhysicalVerification from "../verifierprofiledashboard/PhysicalVerification";
import ComplaintHistory from "../verifierprofiledashboard/ComplaintHistory";
import Notifications from "../verifierprofiledashboard/Notifications";
import ViewLocation from "../verifierprofiledashboard/ViewLocation"; // Adjust path if 
const lifecycleStages = [
  "Completed Work Received",
  "Physical Verification",
  "Verified",
  "Complaint Resolved / Closed",
  "Citizen Notified",
];

const statusToStageIndex = {
  pending: 0,
  in_review: 1,
  verified: 2,
  resolved: 3,
  notified: 4,
  rejected: 1, // sent back mid Physical Verification
};

const statusTone = {
  pending: "amber",
  in_review: "orange",
  verified: "green",
  resolved: "green",
  notified: "green",
  rejected: "red",
};

const statusLabel = {
  pending: "Pending Verification",
  in_review: "Physical Verification",
  verified: "Verified",
  resolved: "Resolved / Closed",
  notified: "Citizen Notified",
  rejected: "Sent Back for Action",
};

const normalizeVerifierStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (["resolved", "closed"].includes(normalized)) return "resolved";
  if (["verified", "approved"].includes(normalized)) return "verified";
  if (["rejected", "sent back for action"].includes(normalized)) return "rejected";
  if (["under verification", "in review", "in_review"].includes(normalized)) return "in_review";
  if (["notified", "citizen notified"].includes(normalized)) return "notified";
  return "pending";
};

const queueTone = { "New Complaints": "navy", "Completed Work": "orange", "Re-verification": "red", "Resolution Requests": "amber" };

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};



const VerifierDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const [verifier, setVerifier] = useState({
    name: storedUser.name || "",
    role: storedUser.designation || storedUser.role || "",
    contact: storedUser.contact || storedUser.mobile || "",
    ward: storedUser.assignedArea || "",
    staffId: storedUser.verifierId || storedUser.staffId || "",
    profilePhoto: storedUser.profilePhoto || "",
  });



  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showMapView, setShowMapView] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showNewComplaints, setShowNewComplaints] = useState(false);
  const [showCompletedWork, setShowCompletedWork] = useState(false);
  const [showReverification, setShowReverification] = useState(false);
  const [showPhysicalVerification, setShowPhysicalVerification] = useState(false);
  const [showComplaintHistory, setShowComplaintHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showViewLocation, setShowViewLocation] = useState(false);

  const openView = (setter) => {
    setShowProfile(false);
    setShowNewComplaints(false);
    setShowCompletedWork(false);
    setShowReverification(false);
    setShowPhysicalVerification(false);
    setShowComplaintHistory(false);
    setShowNotifications(false);
    setShowViewLocation(false);
    setter(true);
  };

  useEffect(() => {
    if (!location.state?.openProfile) return;
    openView(setShowProfile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);



  const selected = items.find((c) => c.id === selectedId) || items[0] || {
    id: null, complaintNumber: "", category: "", issue: "", location: "",
    citizenName: "", citizenContact: "", description: "", status: "pending",
    queue: "New Complaints", photos: {}, log: [],
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const user = getStoredUser();
        const data = await fetchDashboard("verifier", getUserId(user));
        if (data.profile) {
          setVerifier((current) => ({
            ...current,
            ...data.profile,
            contact: data.profile.contact || data.profile.mobile || current.contact,
            staffId: data.profile.verifierId || data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            ward: data.profile.assignedArea || current.ward,
          }));
        }
        const mapped = (data.complaints || []).map((complaint) => ({
          ...complaint,
          status: normalizeVerifierStatus(complaint.status),
          queue: complaint.queue || (
            normalizeVerifierStatus(complaint.status) === "in_review"
              ? "Completed Work"
              : "New Complaints"
          ),
        }));
        setItems(mapped);
        setSelectedId(mapped[0]?.id || null);
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Failed to load verifier dashboard:", error);
      }
    };
    loadDashboard();
  }, []);

  // ✅ PREVIOUS 5 CARDS (First Grid Row)
  const previousStats = [
    { label: "Total Complaints", value: items.length, icon: "📊", tone: "navy" },
    { label: "Pending Verification", value: items.filter((c) => c.status === "pending").length, icon: "⏳", tone: "amber" },
    { label: "Verified", value: items.filter((c) => c.status === "verified").length, icon: "✅", tone: "green" },
    { label: "Rejected", value: items.filter((c) => c.status === "rejected").length, icon: "⛔", tone: "red" },
    { label: "Resolved", value: items.filter((c) => c.status === "resolved").length, icon: "📂", tone: "green" },
  ];

  // ✅ NEW 5 CARDS (Second Grid Row)
  const newStats = [
    { label: "Under Verification", value: items.filter((c) => c.status === "in_review").length, icon: "🔍", tone: "orange" },
    { label: "Completed Work Awaiting", value: items.filter((c) => c.queue === "Completed Work").length, icon: "🛠️", tone: "navy" },
    { label: "Rework / Correction", value: items.filter((c) => c.status === "rejected").length, icon: "🔄", tone: "red" },
    { label: "Resolution Requests", value: items.filter((c) => c.queue === "Resolution Requests").length, icon: "📌", tone: "amber" },
    { label: "Re-verification Queue", value: items.filter((c) => c.queue === "Re-verification").length, icon: "🔁", tone: "red" },
  ];

  const mapGroups = items.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const addLog = (list, text) => [...list, { text, time: "just now" }];

  const openVerification = (c) => {
    setSelectedId(c.id);
    setRemarksDraft(c.remarks || "");
    scrollTo("verification-panel");
  };

  const handleUpdateProfile = async (updatedVerifier) => {
    try {
      const data = await updateDashboardProfile(getUserId(storedUser), {
        name: updatedVerifier.name,
        designation: updatedVerifier.role,
        assignedArea: updatedVerifier.ward,
        contact: updatedVerifier.contact,
        email: updatedVerifier.email,
      });
      setVerifier((current) => ({ ...current, ...updatedVerifier, ...(data.user || {}) }));
    } catch (error) {
      console.error("Failed to update verifier profile:", error);
    }
  };

  // ✅ Handler for Completed Work Verification
  const handleCompletedWorkVerify = async (id, action, remarks, dateTime) => {
    try {
      await updateDashboardComplaint(id, { status: action === "approve" ? "Verified" : "Rejected", remarks });
    } catch (error) {
      console.error("Failed to save verification:", error);
      return;
    }
    setItems(
      items.map((c) => {
        if (c.id === id) {
          if (action === "approve") {
            return {
              ...c,
              status: "verified",
              queue: "Resolution Requests", // Move to next stage
              verifierRemarks: remarks,
              verificationDateTime: dateTime,
              log: [...c.log, { text: `Verified by ${verifier.name}: ${remarks}`, time: "just now" }]
            };
          } else {
            return {
              ...c,
              status: "rejected",
              queue: "Re-verification", // Send back to staff
              verifierRemarks: remarks,
              verificationDateTime: dateTime,
              log: [...c.log, { text: `Rejected by ${verifier.name}: ${remarks}`, time: "just now" }]
            };
          }
        }
        return c;
      })
    );
  };



  const handleMarkNotifAsRead = async (id) => {
    await markDashboardNotificationRead(id).catch((error) => console.error("Failed to mark notification read:", error));
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllNotifsRead = async () => {
    await Promise.all(notifications.filter((notification) => !notification.isRead).map((notification) => markDashboardNotificationRead(notification.id)))
      .catch((error) => console.error("Failed to mark notifications read:", error));
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };



  // ✅ Handler for Physical Verification Submission
  const handlePhysicalVerificationSubmit = async (id, decision, remarks, dateTime) => {
    try {
      await updateDashboardComplaint(id, { status: decision === "approve" ? "Verified" : "Rejected", remarks });
    } catch (error) {
      console.error("Failed to save physical verification:", error);
      return;
    }
    setItems(
      items.map((c) => {
        if (c.id === id) {
          const logEntry = {
            text: `Physical Verification ${decision === 'approve' ? 'Approved' : 'Rejected'}: "${remarks}"`,
            time: "just now"
          };

          if (decision === "approve") {
            return {
              ...c,
              status: "verified",
              queue: "Resolution Requests", // Moves to next stage
              remarks: remarks,
              verificationDateTime: dateTime,
              log: [...c.log, logEntry]
            };
          } else {
            return {
              ...c,
              status: "rejected",
              queue: "Re-verification", // Sent back for correction
              remarks: remarks,
              previousRemarks: remarks, // Saves reason for the Re-verification page
              verificationDateTime: dateTime,
              log: [...c.log, logEntry]
            };
          }
        }
        return c;
      })
    );
  };

  // ✅ Handler for Re-verification Actions
  const handleReverifyAction = (id, action, remarks, dateTime) => {
    setItems(
      items.map((c) => {
        if (c.id === id) {
          const logEntry = {
            text: `${action === "approve" ? "Re-verification Approved" : "Rejected Again"} by ${verifier.name}: "${remarks}"`,
            time: "just now"
          };

          if (action === "approve") {
            return {
              ...c,
              status: "verified",
              queue: "Resolution Requests", // Moves to final resolution stage
              remarks: remarks,
              verificationDateTime: dateTime,
              log: [...c.log, logEntry, { text: "System: Assigned staff member notified of approval.", time: "just now" }]
            };
          } else {
            // Stays in Re-verification queue but updates remarks
            return {
              ...c,
              status: "rejected",
              queue: "Re-verification",
              remarks: remarks,
              previousRemarks: remarks, // Update the previous remarks for the next loop
              verificationDateTime: dateTime,
              log: [...c.log, logEntry, { text: "System: Assigned staff member notified of rejection.", time: "just now" }]
            };
          }
        }
        return c;
      })
    );
  };
  // ✅ ADDED: Proper Logout Functionality
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("verifierData");
      window.location.href = "/login";
    }
  };

  // ---------------- PHYSICAL VERIFICATION: compare, then approve or reject ----------------
  const approveWork = async (id) => {
    try {
      await updateDashboardComplaint(id, { status: "Verified", remarks: remarksDraft });
    } catch (error) {
      console.error("Failed to approve work:", error);
      return;
    }
    setItems(
      items.map((c) =>
        c.id === id
          ? { ...c, status: "verified", remarks: remarksDraft, log: addLog(c.log, "Approved — work satisfies the reported issue") }
          : c
      )
    );
  };

  const rejectWork = async (id) => {
    if (!remarksDraft.trim()) return;
    try {
      await updateDashboardComplaint(id, { status: "Rejected", remarks: remarksDraft });
    } catch (error) {
      console.error("Failed to reject work:", error);
      return;
    }
    setItems(
      items.map((c) =>
        c.id === id
          ? {
            ...c,
            status: "rejected",
            queue: "Re-verification",
            remarks: remarksDraft,
            log: addLog(c.log, "Rejected — sent back for further action"),
          }
          : c
      )
    );
  };

  // ---------------- Staff completes further action -> back into review ----------------
  const sendForReverification = async (id) => {
    try {
      await updateDashboardComplaint(id, { status: "Under Verification", remarks: "Sent for re-verification" });
    } catch (error) {
      console.error("Failed to send complaint for re-verification:", error);
      return;
    }
    setItems(
      items.map((c) =>
        c.id === id
          ? { ...c, status: "in_review", log: addLog(c.log, "Staff completed further action — ready for re-verification") }
          : c
      )
    );
  };

  // ---------------- UPDATE status as Verified -> Resolved/Closed -> Notify citizen ----------------
  const markResolved = async (id) => {
    try {
      await updateDashboardComplaint(id, { status: "Resolved" });
    } catch (error) {
      console.error("Failed to mark complaint resolved:", error);
      return;
    }
    setItems(
      items.map((c) => (c.id === id ? { ...c, status: "resolved", log: addLog(c.log, "Marked as Resolved / Closed") } : c))
    );
  };

  const notifyCitizen = (id) => {
    setItems(
      items.map((c) => (c.id === id ? { ...c, status: "notified", log: addLog(c.log, "Citizen notified of status update") } : c))
    );
  };

  const initials = verifier.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


  if (showProfile) {
    return (
      <MyProfile
        initialVerifier={verifier}
        onBack={() => setShowProfile(false)}
        onUpdate={handleUpdateProfile}
      />
    );
  }

  // ✅ FULL PAGE CONDITIONAL RENDERING - Shows NewComplaints as full page
  if (showNewComplaints) {
    return (
      <NewComplaints
        complaints={items}
        onBack={() => setShowNewComplaints(false)}
      />
    );
  }

  // ✅ FULL PAGE CONDITIONAL RENDERING
  if (showComplaintHistory) {
    return (
      <ComplaintHistory
        complaints={items}
        onBack={() => setShowComplaintHistory(false)}
      />
    );
  }

  // ✅ FULL PAGE CONDITIONAL RENDERING
  if (showPhysicalVerification) {
    return (
      <PhysicalVerification
        complaints={items}
        onBack={() => setShowPhysicalVerification(false)}
        onSubmitVerification={handlePhysicalVerificationSubmit}
      />
    );
  }

  // ✅ FULL PAGE CONDITIONAL RENDERING
  if (showCompletedWork) {
    return (
      <CompletedWork
        complaints={items}
        onBack={() => setShowCompletedWork(false)}
        onVerify={handleCompletedWorkVerify}
      />
    );
  }

  // ✅ FULL PAGE CONDITIONAL RENDERING
  if (showReverification) {
    return (
      <Reverification
        complaints={items}
        onBack={() => setShowReverification(false)}
        onReverify={handleReverifyAction}
      />
    );
  }
  if (showNotifications) {
    return (
      <Notifications
        notifications={notifications}
        onBack={() => setShowNotifications(false)}
        onMarkAsRead={handleMarkNotifAsRead}
        onMarkAllRead={handleMarkAllNotifsRead}
      />
    );
  }

    // ✅ FULL PAGE CONDITIONAL RENDERING
  if (showViewLocation) {
    return (
      <ViewLocation 
        complaints={items} 
        onBack={() => setShowViewLocation(false)} 
      />
    );
  }


  return (
    <div className="vd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="vd-sidebar">
        <div className="vd-sb-brand">
          <div className="vd-sb-logo">MI</div>
          <div>
            <b>MyRoad India</b>
            <span>Verifier Portal</span>
          </div>
        </div>

        {/* ✅ REORGANIZED & CLEAN SIDEBAR NAVIGATION */}
        <div className="vd-sb-label">Overview</div>
        <nav className="vd-sb-nav">
          <button type="button" className="vd-sb-link active" onClick={() => scrollTo("vd-top")}>
            📊 Dashboard
          </button>

          <button type="button" className="vd-sb-link" onClick={() => openView(setShowProfile)}>
            👤 My Profile
          </button>


        </nav>

        <div className="vd-sb-label">Verification Queues</div>
        <nav className="vd-sb-nav">


          <button type="button" className="vd-sb-link" onClick={() => openView(setShowNewComplaints)}>
            🆕New Complaints
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "New Complaints").length}</span>
          </button>


          <button type="button" className="vd-sb-link" onClick={() => openView(setShowCompletedWork)}>
            🛠️ Completed Work
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Completed Work").length}</span>
          </button>


          <button type="button" className="vd-sb-link" onClick={() => openView(setShowReverification)}>
            🛠️Re-verification
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Re-verification").length}</span>
          </button>





        </nav>

        <div className="vd-sb-label">Tools & Actions</div>
        <nav className="vd-sb-nav">

          <button type="button" className="vd-sb-link" onClick={() => openView(setShowPhysicalVerification)}>
            🔍 Physical Verification
          </button>

          <button type="button" className="vd-sb-link" onClick={() => openView(setShowComplaintHistory)}>
            📜 Complaint History
          </button>

          <button type="button" className="vd-sb-link" onClick={() => openView(setShowNotifications)}>
            🔔 Notifications
            <span className="vd-sb-badge">{notifications.filter((n) => !n.isRead).length}</span>
          </button>

          <button
            type="button"
            className="vd-sb-link"
            onClick={() => openView(setShowViewLocation)}
          >
            🗺️ View Location
          </button>





        </nav>

        <div className="vd-sb-label">Account</div>
        <nav className="vd-sb-nav">
          <button
            type="button"
            className="vd-sb-link"
            onClick={handleLogout}
            style={{ color: "#ff6b6b", marginTop: "8px" }}
          >
            🚪 Logout
          </button>
        </nav>

        <div className="vd-sb-footer">
          <div className="vd-sb-user">
            <div className="vd-sb-avatar">
              {verifier.profilePhoto ? <img src={verifier.profilePhoto} alt="Profile" /> : initials}
            </div>
            <div className="vd-sb-user-info">
              <b>{verifier.name}</b>
              <span>{verifier.staffId}</span>
            </div>
          </div>
          <div className="vd-sb-ward">
            {verifier.role} · {verifier.ward}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="vd-main" id="vd-top">
        {/* TOPBAR */}
        <div className="vd-topbar">
          <div className="vd-search">
            🔍 <input type="text" placeholder="Search complaints to verify..." />
          </div>
          <div className="vd-tb-actions">
            <div className="vd-tb-user" id="vd-profile">
              <div className="vd-tb-avatar">
                {verifier.profilePhoto ? <img src={verifier.profilePhoto} alt="Profile" /> : initials}
              </div>
              <div>
                <b>{verifier.name}</b>
                <span>{verifier.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="vd-content">
          <div className="vd-title-row">
            <div>
              <h1>Welcome back, {verifier.name.split(" ")[0]}</h1>
              <p>
                {verifier.role} · {verifier.ward} · {verifier.contact}
              </p>
            </div>
          </div>

          {/* ✅ FIRST GRID ROW: Previous 5 Cards */}
          <div className="vd-stats-row">
            {previousStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}>
                <div className="vd-stat-ic">{stat.icon}</div>
                <div className="vd-stat-num">{stat.value}</div>
                <div className="vd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ✅ SECOND GRID ROW: New 5 Cards */}
          <div className="vd-stats-row" style={{ marginTop: "16px" }}>
            {newStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}>
                <div className="vd-stat-ic">{stat.icon}</div>
                <div className="vd-stat-num">{stat.value}</div>
                <div className="vd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN: QUEUE TABLE + LIFECYCLE/ACTIVITY */}
          <div className="vd-dash-grid" id="queue-panel">
            {/* LEFT: Pending Verifications (READ) */}
            <div className="vd-panel">
              <div className="vd-panel-head">
                <h3>Pending Verifications</h3>
                <span className="vd-panel-link">{items.length} total</span>
              </div>

              <div className="vd-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Complaint</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Queue</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr
                        key={c.id}
                        className={selectedId === c.id ? "vd-row-active" : ""}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td className="vd-mono">{c.complaintNumber}</td>
                        <td>
                          <div className="vd-cat">
                            <span className="vd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                            {c.issue}
                          </div>
                        </td>
                        <td>{c.location || "Location pending"}</td>
                        <td>
                          <span className={`vd-badge vd-badge-${queueTone[c.queue]}`}>{c.queue}</span>
                        </td>
                        <td>
                          <span className={`vd-badge vd-badge-${statusTone[c.status]}`}>{statusLabel[c.status]}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="vd-icon-btn small" type="button" onClick={() => openVerification(c)} title="Open Verification">
                            🔍
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Lifecycle + Activity Log */}
            <div className="vd-side-col">
              <div className="vd-panel">
                <div className="vd-panel-head">
                  <h3>Verification Lifecycle</h3>
                  <span className="vd-mono vd-faint">{selected.complaintNumber}</span>
                </div>
                <p className="vd-lifecycle-location">📍 {selected.location || "Location pending"}</p>
                {selected.status === "rejected" && (
                  <div className="vd-status-banner reject">Sent back for further action — awaiting re-inspection.</div>
                )}
                <div className="vd-lifecycle">
                  {lifecycleStages.map((stage, i) => {
                    const currentIndex = statusToStageIndex[selected.status];
                    return (
                      <div className="vd-lc-item" key={i}>
                        <div
                          className={`vd-lc-dot ${selected.status === "rejected" && i === 1
                              ? "reject"
                              : i < currentIndex
                                ? "done"
                                : i === currentIndex
                                  ? "now"
                                  : "pend"
                            }`}
                        ></div>
                        <div className="vd-lc-body">
                          <b>{stage}</b>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="vd-panel" id="history-panel">
                <div className="vd-panel-head">
                  <h3>Activity Log</h3>
                </div>
                <div className="vd-notif-list">
                  {selected.log.map((note, i) => (
                    <div className="vd-notif-item" key={i}>
                      <span className="vd-notif-dot"></span>
                      <div>
                        <b>{note.text}</b>
                        <span>{note.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COMPLAINT DETAILS (READ — Category, Description, Citizen Details, Complaint Number) */}
          <div className="vd-panel vd-form-panel">
            <div className="vd-panel-head">
              <h3>Complaint Details</h3>
              <span className="vd-panel-link">{selected.complaintNumber}</span>
            </div>
            <div className="vd-detail-grid">
              <div className="vd-detail-item">
                <span>Complaint Number</span>
                <b>{selected.complaintNumber}</b>
              </div>
              <div className="vd-detail-item">
                <span>Category</span>
                <b>{selected.category}</b>
              </div>
              <div className="vd-detail-item">
                <span>Citizen</span>
                <b>{selected.citizenName}</b>
              </div>
              <div className="vd-detail-item">
                <span>Citizen Contact</span>
                <b>{selected.citizenContact}</b>
              </div>
              <div className="vd-detail-item vd-detail-wide">
                <span>Description</span>
                <b>{selected.description}</b>
              </div>
            </div>
          </div>

          {/* VIEW PHOTOS: Before Repair, Site Photo, After Repair */}
          <div className="vd-panel vd-form-panel">
            <div className="vd-panel-head">
              <h3>Photos — {selected.complaintNumber}</h3>
            </div>
            <div className="vd-photo-grid">
              <div className="vd-photo-card">
                <div className="vd-photo-thumb">📷</div>
                <span>Before Repair</span>
                <b>{selected.photos.before || "Not available"}</b>
              </div>
              <div className="vd-photo-card">
                <div className="vd-photo-thumb">📷</div>
                <span>Site Photo</span>
                <b>{selected.photos.site || "Not available"}</b>
              </div>
              <div className="vd-photo-card">
                <div className="vd-photo-thumb">📷</div>
                <span>After Repair</span>
                <b>{selected.photos.after || "Not available"}</b>
              </div>
            </div>
          </div>

          {/* PHYSICAL VERIFICATION: compare reported issue with completed work, then approve or reject */}
          <div className="vd-panel vd-form-panel" id="verification-panel">
            <div className="vd-panel-head">
              <h3>Physical Verification — {selected.complaintNumber}</h3>
              <span className={`vd-badge vd-badge-${statusTone[selected.status]}`}>{statusLabel[selected.status]}</span>
            </div>
            <div className="vd-new-form">
              <p className="vd-compare-note">
                Compare the reported issue against the completed work and photos above before recording a decision.
              </p>
              <div className="vd-field">
                <label htmlFor="verifier-remarks">Verifier Remarks</label>
                <textarea
                  id="verifier-remarks"
                  rows="3"
                  placeholder="Note what you observed on-site"
                  value={remarksDraft}
                  onChange={(e) => setRemarksDraft(e.target.value)}
                ></textarea>
              </div>

              <div className="vd-verify-actions">
                {(selected.status === "pending" || selected.status === "in_review") && (
                  <>
                    <button className="vd-btn-danger" type="button" onClick={() => rejectWork(selected.id)}>
                      Work Not Satisfied — Reject
                    </button>
                    <button className="vd-btn-primary" type="button" onClick={() => approveWork(selected.id)}>
                      Work Satisfied — Approve / Verify
                    </button>
                  </>
                )}

                {selected.status === "rejected" && (
                  <button className="vd-btn-outline" type="button" onClick={() => sendForReverification(selected.id)}>
                    Staff Completed Action → Send for Re-verification
                  </button>
                )}

                {selected.status === "verified" && (
                  <button className="vd-btn-primary" type="button" onClick={() => markResolved(selected.id)}>
                    Update Status → Resolved / Closed
                  </button>
                )}



                {selected.status === "resolved" && (
                  <button className="vd-btn-primary" type="button" onClick={() => notifyCitizen(selected.id)}>
                    Notify Citizen of Status Update
                  </button>
                )}

                {selected.status === "notified" && <span className="vd-done-note">✅ Citizen has been notified — complaint closed.</span>}
              </div>
            </div>
          </div>

          {/* VIEW LOCATION ON MAP (READ — grouped by location) */}
          {showMapView && (
            <div className="vd-panel vd-form-panel" id="map-section">
              <div className="vd-panel-head">
                <h3>Complaint Locations — {verifier.ward}</h3>
                <span className="vd-panel-link" onClick={() => setShowMapView(false)} style={{ cursor: "pointer" }}>
                  Hide Map View
                </span>
              </div>
              <div className="vd-map-grid">
                {Object.entries(mapGroups).map(([location, group]) => (
                  <div className="vd-map-ward-card" key={location}>
                    <p className="vd-map-ward-name">{location}</p>
                    <div className="vd-map-pins">
                      {group.map((c) => (
                        <span
                          className="vd-map-pin"
                          key={c.id}
                          style={{ background: colorForCategory(c.category) }}
                          title={`${c.complaintNumber} — ${c.category}`}
                        >
                          📍
                        </span>
                      ))}
                    </div>
                    <span className="vd-map-ward-count">
                      {group.length} complaint{group.length !== 1 ? "s" : ""} to verify
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="vd-quick-row">
            <button className="vd-quick-card" type="button" onClick={() => scrollTo("queue-panel")}>
              <div className="vd-quick-ic navy">🗂️</div>
              <div>
                <h5>View Pending Verifications</h5>
                <p>New, completed, and re-verification queues</p>
              </div>
            </button>
            <button className="vd-quick-card" type="button" onClick={() => openVerification(selected)}>
              <div className="vd-quick-ic saffron">🔍</div>
              <div>
                <h5>Run Physical Verification</h5>
                <p>Compare reported issue with completed work</p>
              </div>
            </button>
            <button
              className="vd-quick-card"
              type="button"
              onClick={() => {
                setShowMapView(true);
                scrollTo("map-section");
              }}
            >
              <div className="vd-quick-ic green">🗺️</div>
              <div>
                <h5>View Location on Map</h5>
                <p>See complaints awaiting verification</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;