import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [authState, setAuthState] = useState(() => {
    try {
      const user = sessionStorage.getItem("user");
      const token = sessionStorage.getItem("token");

      return {
        user: user ? JSON.parse(user) : null,
        token: token || null,
      };
    } catch (error) {
      console.error("❌ Error parsing auth state:", error);
      return { user: null, token: null };
    }
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(20);
  const logoutTimerRef = useRef(null); // ✅ Track the countdown interval

  useEffect(() => {
    const publicRoutes = ["/", "/login"];

    if (!authState.token && !publicRoutes.includes(location.pathname)) {
      console.log("🚨 No token found. Redirecting to login...");
      resetLogoutState(); // ✅ Reset modal & countdown on manual logout
      navigate("/login", { replace: true });
    }
  }, [authState.token, location.pathname, navigate]);

  // ✅ Function to Verify User Existence
  const verifyAuth = async () => {
    try {
      if (!authState.token) return;

      const token = sessionStorage.getItem("token");

      if (!token) {
        console.warn("🚨 No token found in storage! Logging out...");
        triggerLogoutPopup();
        return;
      }

      const response = await axios.get("https://question-paper-generater.onrender.com/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data || !response.data.user) {
        console.warn("🚨 User no longer exists! Triggering logout pop-up...");
        triggerLogoutPopup();
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          console.warn("🚨 User not found in database. Logging out...");
          triggerLogoutPopup();
        } else if (error.response.status === 401) {
          console.warn("🚨 Unauthorized access detected. Forcing logout...");
          triggerLogoutPopup();
        } else {
          console.warn(`⚠️ API Error: ${error.response.status}. Not forcing logout.`);
        }
      } else {
        console.warn("⚠️ Network or server error - Ignoring forced logout.");
      }
    }
  };

  // ✅ Run Periodic Verification Every 5 Seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (authState.token) {
        verifyAuth();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authState.token]);

  // ✅ Show Logout Pop-Up Before Logging Out (Forced Logout)
  const triggerLogoutPopup = () => {
    if (showLogoutModal || logoutTimerRef.current) return; // Prevent multiple timers

    console.log("🚨 Logout countdown started...");
    setShowLogoutModal(true);
    setLogoutCountdown(20);

    logoutTimerRef.current = setInterval(() => {
      setLogoutCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(logoutTimerRef.current);
          logoutTimerRef.current = null;
          forceLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ✅ Reset Logout State (Fixes Ghost Pop-Up Issue)
  const resetLogoutState = () => {
    clearInterval(logoutTimerRef.current);
    logoutTimerRef.current = null;
    setShowLogoutModal(false);
    setLogoutCountdown(20);
  };

  // ✅ Handle Forced Logout
  const forceLogout = () => {
    console.warn("🚨 Forced logout triggered!");

    resetLogoutState(); // ✅ Reset modal & timer state

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setAuthState({ user: null, token: null });

    navigate("/login", { replace: true });
  };

  // ✅ Handle Normal Logout (Button Click)
  const logout = () => {
    console.log("👋logout triggered!");

    resetLogoutState(); // ✅ Reset modal & countdown state properly

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setAuthState({ user: null, token: null });

    navigate("/login", { replace: true });
  };

  const login = (user, token) => {
    try {
      resetLogoutState(); // ✅ Ensure no old pop-up remains
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      setAuthState({ user, token });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("❌ Error storing login data:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, forceLogout }}>
      {children}

      {/* ✅ Logout Pop-Up */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <h2 className="text-xl font-bold text-red-600">⚠️ You have been removed!</h2>
            <p className="mt-2 text-gray-600">Logging out in {logoutCountdown} seconds...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
