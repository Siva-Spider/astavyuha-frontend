import React, { useState, useEffect } from "react";
import { apiGet } from "../api"; // helper for backend API calls

export default function Orders() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch orders from API whenever dates change
  useEffect(() => {
    fetchOrders();
  }, [fromDate, toDate]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let query = "";
      if (fromDate && toDate) query = `?from=${fromDate}&to=${toDate}`;
      else if (fromDate) query = `?from=${fromDate}`;
      else if (toDate) query = `?to=${toDate}`;

      const data = await apiGet(`/orders${query}`);
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      alert("Failed to fetch orders!");
    } finally {
      setLoading(false);
    }
  }

  // Totals
  const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
  const totalLoss = orders.reduce((sum, o) => sum + (o.loss || 0), 0);
  const netPL = totalProfit - totalLoss;

  const inputStyle = {
    padding: "0.5rem",
    marginRight: "1rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
  };

  const cardStyle = {
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  return (
    <div>
      <h2>Orders</h2>

      {/* Date Filters */}
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center" }}>
        <div>
          <label>From: </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label>To: </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button
          onClick={fetchOrders}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <>
          {/* Totals Summary */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={cardStyle}>
              <strong>Total Profit:</strong> ₹{totalProfit}
            </div>
            <div style={cardStyle}>
              <strong>Total Loss:</strong> ₹{totalLoss}
            </div>
            <div style={cardStyle}>
              <strong>Net P/L:</strong>{" "}
              <span style={{ color: netPL >= 0 ? "green" : "red" }}>₹{netPL}</span>
            </div>
          </div>

          {/* Orders Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#eee" }}>
                <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Order ID</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Date</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Profit</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Loss</th>
                <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>{order.id}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>{order.date}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                      ₹{order.profit || 0}
                    </td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                      ₹{order.loss || 0}
                    </td>
                    <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                      ₹{(order.profit || 0) - (order.loss || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "1rem", color: "#777" }}>
                    No orders found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
