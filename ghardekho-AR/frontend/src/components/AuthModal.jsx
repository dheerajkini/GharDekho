import { useState } from "react";
import { playPageTransitionSound } from "../utils/audioHelper";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!emailOrPhone.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Get existing users from localStorage
    const users = JSON.parse(localStorage.getItem("ghardekho_users") || "[]");

    if (isLogin) {
      // Login flow
      const user = users.find(
        (u) =>
          (u.email === emailOrPhone.trim() || u.number === emailOrPhone.trim()) &&
          u.password === password
      );

      if (!user) {
        setError("Invalid email/number or password.");
        return;
      }

      setSuccess("Logged in successfully! 🎉");
      localStorage.setItem("ghardekho_active_user", JSON.stringify(user));
      playPageTransitionSound();
      setTimeout(() => {
        onAuthSuccess(user);
        resetForm();
      }, 800);
    } else {
      // Sign Up flow
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      // Check if user already exists
      const isEmail = emailOrPhone.includes("@");
      const exists = users.some(
        (u) =>
          u.email === emailOrPhone.trim() ||
          u.number === emailOrPhone.trim()
      );

      if (exists) {
        setError("An account with this email/number already exists.");
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        email: isEmail ? emailOrPhone.trim() : "",
        number: !isEmail ? emailOrPhone.trim() : "",
        password: password,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem("ghardekho_users", JSON.stringify(users));

      setSuccess("Account created successfully! Please log in. 🔑");
      setTimeout(() => {
        setIsLogin(true);
        setPassword(newUser.password);
        setEmailOrPhone(isEmail ? newUser.email : newUser.number);
        setError("");
        setSuccess("");
      }, 1500);
    }
  };

  const resetForm = () => {
    setEmailOrPhone("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(5, 5, 15, 0.75)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      animation: "fadeIn 0.25s ease-out"
    }}>
      <div style={{
        background: "rgba(15, 15, 30, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "20px",
        padding: "32px",
        width: "90%",
        maxWidth: "400px",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
        position: "relative",
        color: "#fff",
        fontFamily: "'Segoe UI', Roboto, sans-serif"
      }}>
        {/* Close Button */}
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "1.2rem",
            cursor: "pointer",
            transition: "color 0.2s"
          }}
          onMouseEnter={e => e.target.style.color = "#ff7675"}
          onMouseLeave={e => e.target.style.color = "rgba(255, 255, 255, 0.5)"}
        >
          ✕
        </button>

        <h2 style={{
          textAlign: "center",
          marginBottom: "8px",
          background: "linear-gradient(135deg, #a29bfe, #6c5ce7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: 800,
          fontSize: "1.6rem"
        }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        
        <p style={{
          textAlign: "center",
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.5)",
          marginBottom: "24px"
        }}>
          {isLogin ? "Log in to save your designs" : "Sign up in seconds to start building"}
        </p>

        {error && (
          <div style={{
            background: "rgba(225, 112, 85, 0.15)",
            border: "1px solid #ff7675",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#ff7675",
            fontSize: "0.82rem",
            marginBottom: "16px",
            textAlign: "center"
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(0, 184, 148, 0.15)",
            border: "1px solid #00b894",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#00b894",
            fontSize: "0.82rem",
            marginBottom: "16px",
            textAlign: "center"
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.7)",
              marginBottom: "6px",
              fontWeight: 600
            }}>Email Address or Phone Number</label>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="name@email.com or +9198765..."
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.25)",
                color: "#fff",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={e => e.target.style.borderColor = "#6c5ce7"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.7)",
              marginBottom: "6px",
              fontWeight: 600
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.25)",
                color: "#fff",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={e => e.target.style.borderColor = "#6c5ce7"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
            />
          </div>

          {!isLogin && (
            <div>
              <label style={{
                display: "block",
                fontSize: "0.78rem",
                color: "rgba(255,255,255,0.7)",
                marginBottom: "6px",
                fontWeight: 600
              }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#fff",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={e => e.target.style.borderColor = "#6c5ce7"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>
          )}

          <button
            type="submit"
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(108,92,231,0.4)",
              transition: "transform 0.15s, boxShadow 0.15s",
              marginTop: "8px"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(108,92,231,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(108,92,231,0.4)";
            }}
          >
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          fontSize: "0.82rem",
          marginTop: "20px",
          color: "rgba(255,255,255,0.5)"
        }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            style={{
              color: "#a29bfe",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            {isLogin ? "Sign Up" : "Log In"}
          </span>
        </div>
      </div>
    </div>
  );
}
