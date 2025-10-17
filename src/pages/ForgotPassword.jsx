import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost("/forgot-password", { email });
      if (data.success) {
        setMessage("OTP sent to your registered email!");
        setStep(2);
      } else {
        setMessage(data.message || "Failed to send OTP");
      }
    } catch (err) {
      setMessage("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const data = await apiPost(`/api/admin/reset-password/${email}`, {}); // username/email passed here
    if (data.success) {
      setMessage("Password reset! Check your email for the new password.");
      setTimeout(() => navigate("/"), 2000);
    } else {
      setMessage(data.message || "Password reset failed");
    }
  } catch (err) {
    setMessage("Error connecting to server");
  } finally {
    setLoading(false);
  }
  };


  const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    marginBottom: "1rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f0f0",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          width: "380px",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "1rem" }}>Forgot Password</h2>

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <input
              type="email"
              placeholder="Enter registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "0.6rem 1.2rem",
                width: "100%",
                cursor: "pointer",
              }}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="Enter New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "0.6rem 1.2rem",
                width: "100%",
                cursor: "pointer",
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {message && (
          <p style={{ marginTop: "1rem", color: message.includes("successful") ? "green" : "red" }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: "1rem" }}>
          <span
            onClick={() => navigate("/")}
            style={{ color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
          >
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
}
