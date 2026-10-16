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

export const updateDashboardComplaint = (id, updates) =>
  request(`/dashboard/complaints/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

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

export const toMediaUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE_URL.replace(/\/api$/, "")}${value.startsWith("/") ? value : `/${value}`}`;
};

export { API_BASE_URL };
