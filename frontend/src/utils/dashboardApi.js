const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3200/api";

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Unable to read logged-in user:", error);
    return {};
  }
};

export const getUserId = (user) => user?._id || user?.id || user?.userId || null;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
};

export const fetchDashboard = (role, userId) =>
  request(`/dashboard/${role}${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`);

export const fetchStaffAssignedComplaints = (userId) => {
  if (!userId) throw new Error("A logged-in staff user is required");
  return request(`/dashboard/staff-assigned-complaints?userId=${encodeURIComponent(userId)}`);
};

export const fetchDashboardUsers = (role) =>
  request(`/users?role=${encodeURIComponent(role)}`);

export const updateDashboardComplaint = (id, updates) => {
  const role = String(getStoredUser()?.role || "").toLowerCase();
  const actorRole = ["admin", "staff", "verifier"].includes(role) ? role : undefined;
  return request(`/dashboard/complaints/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...updates, ...(actorRole ? { actorRole } : {}) }),
  });
};

export const markDashboardNotificationRead = (id) =>
  request(`/dashboard/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });

export const uploadDashboardPhoto = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`${API_BASE_URL}/photos/upload`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Photo upload failed (${response.status})`);
  }
  return data;
};

export const uploadProfilePhoto = async (file, userId, role) => {
  if (!file || !userId || !role) {
    throw new Error("A profile image and logged-in user are required");
  }
  const formData = new FormData();
  formData.append("image", file);
  formData.append("userId", userId);
  formData.append("role", role);
  const response = await fetch(`${API_BASE_URL}/photos/profile`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Profile photo upload failed (${response.status})`);
  }
  return data;
};

export const updateDashboardProfile = (id, updates) =>
  request(`/users/profile/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

export const changeDashboardPassword = (id, currentPassword, newPassword) =>
  request(`/auth/users/${encodeURIComponent(id)}/password`, {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const toMediaUrl = (value) => {
  if (!value) return "";
  const mediaPath = String(value).trim().replace(/\\/g, "/");
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  if (/^https?:\/\//i.test(mediaPath)) {
    try {
      const parsedUrl = new URL(mediaPath);
      if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname)) {
        return `${apiOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }
      return mediaPath;
    } catch (error) {
      console.error("Invalid complaint media URL:", error);
      return mediaPath;
    }
  }
  return `${apiOrigin}${mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`}`;
};

export { API_BASE_URL };
