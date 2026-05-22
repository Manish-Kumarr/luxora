import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const MAX_SIZE = 3 * 1024 * 1024; // 3MB

export default function UploadDocs() {
  const bookingId = new URLSearchParams(window.location.search).get("id");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  // guestFiles[i] = { front: File|null, back: File|null, frontPreview: str|null, backPreview: str|null }
  const [guestFiles, setGuestFiles] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    supabase
      .from("guest_bookings")
      .select("*")
      .eq("id", bookingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setBooking(data);
          const count = Math.max(1, Number(data.guests_count) || 1);
          setGuestFiles(
            Array.from({ length: count }, () => ({
              front: null,
              back: null,
              frontPreview: null,
              backPreview: null,
            }))
          );
          if (data.docs_status === "received") setDone(true);
        }
        setLoading(false);
      });
  }, [bookingId]);

  const pickFile = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError("File must be under 3MB.");
      return;
    }
    setError("");
    const url = URL.createObjectURL(file);
    setGuestFiles((prev) =>
      prev.map((g, i) =>
        i === activeTab
          ? {
              ...g,
              [side]: file,
              [`${side}Preview`]: url,
            }
          : g
      )
    );
  };

  const handleUpload = async () => {
    // Validate all guests have at least front side
    for (let i = 0; i < guestFiles.length; i++) {
      if (!guestFiles[i].front) {
        setActiveTab(i);
        setError(
          `Please upload at least the front side of the document for Guest ${i + 1}.`
        );
        return;
      }
    }
    setError("");
    setUploading(true);

    const uploadFile = async (file, name) => {
      const path = `${bookingId}/${name}`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      return error;
    };

    for (let i = 0; i < guestFiles.length; i++) {
      const prefix = `guest_${i + 1}`;
      const frontErr = await uploadFile(
        guestFiles[i].front,
        `${prefix}_doc_front`
      );
      if (frontErr) {
        setError(`Upload failed for Guest ${i + 1} (front). Please try again.`);
        setUploading(false);
        return;
      }
      if (guestFiles[i].back) {
        const backErr = await uploadFile(
          guestFiles[i].back,
          `${prefix}_doc_back`
        );
        if (backErr) {
          setError(`Upload failed for Guest ${i + 1} (back). Please try again.`);
          setUploading(false);
          return;
        }
      }
    }

    const { error: updateErr } = await supabase
      .from("guest_bookings")
      .update({ docs_status: "received" })
      .eq("id", bookingId);

    setUploading(false);
    if (updateErr) {
      setError("Could not update status. Please try again.");
      return;
    }
    setDone(true);
  };

  if (loading)
    return (
      <div style={styles.page}>
        <p style={{ color: "#444", fontSize: "14px" }}>Loading...</p>
      </div>
    );

  if (notFound)
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div
            style={{
              fontSize: "40px",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            ❌
          </div>
          <p
            style={{
              color: "#e0e0e0",
              fontWeight: "700",
              fontSize: "16px",
              textAlign: "center",
            }}
          >
            Booking not found
          </p>
          <p
            style={{
              color: "#555",
              fontSize: "13px",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            This link is invalid or has expired. Please contact us.
          </p>
        </div>
      </div>
    );

  if (done)
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "14px" }}>✅</div>
          <p
            style={{
              color: "#f0f0f0",
              fontWeight: "700",
              fontSize: "18px",
              marginBottom: "8px",
            }}
          >
            Documents Received!
          </p>
          <p style={{ color: "#666", fontSize: "13px", lineHeight: "1.6" }}>
            Thank you,{" "}
            <strong style={{ color: "#33b5b5" }}>{booking?.name}</strong>! Your
            documents have been submitted successfully. We'll verify and get
            back to you.
          </p>
        </div>
      </div>
    );

  const fmt = (d) => {
    if (!d) return "";
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  };

  const guestCount = guestFiles.length;
  const current = guestFiles[activeTab] || {};

  // Progress: how many guests have both docs
  const completedGuests = guestFiles.filter((g) => g.front && g.back).length;

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/logo.png"
            alt="Luxora"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #2a2a2a",
              marginBottom: "14px",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#f0f0f0" }}>
            Upload Documents
          </h1>
          <p style={{ color: "#555", fontSize: "13px", marginTop: "4px" }}>
            Gov approved document required for check-in verification
          </p>
        </div>

        {/* Booking Info */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: "12px",
            padding: "16px 18px",
            marginBottom: "20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "#444",
              fontWeight: "600",
              letterSpacing: "0.08em",
              marginBottom: "10px",
            }}
          >
            YOUR BOOKING
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {[
              { label: "Name", value: booking.name },
              { label: "Phone", value: booking.phone },
              { label: "Check-in", value: fmt(booking.check_in) },
              { label: "Check-out", value: fmt(booking.check_out) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: "11px", color: "#555" }}>{label}</p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#e0e0e0",
                    fontWeight: "500",
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Tabs */}
        {guestCount > 1 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
              overflowX: "auto",
              paddingBottom: "2px",
            }}
          >
            {guestFiles.map((g, i) => {
              const isActive = activeTab === i;
              const isDone = g.front && g.back;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setActiveTab(i);
                    setError("");
                  }}
                  style={{
                    flex: "0 0 auto",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: isActive
                      ? "1px solid rgba(0,128,128,0.6)"
                      : "1px solid #1e1e1e",
                    background: isActive
                      ? "rgba(0,128,128,0.15)"
                      : "#111",
                    color: isActive ? "#33b5b5" : "#555",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isDone && (
                    <span style={{ fontSize: "12px", color: "#22c55e" }}>
                      ✓
                    </span>
                  )}
                  Guest {i + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Progress hint */}
        {guestCount > 1 && (
          <p
            style={{
              fontSize: "11px",
              color: "#444",
              marginBottom: "14px",
              textAlign: "center",
            }}
          >
            {completedGuests} of {guestCount} guests completed
          </p>
        )}

        {/* Upload Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <UploadBox
            label={
              guestCount > 1
                ? `Guest ${activeTab + 1} — Document Front *`
                : "Document Front *"
            }
            preview={current.frontPreview}
            onChange={(e) => pickFile(e, "front")}
          />
          <UploadBox
            label={
              guestCount > 1
                ? `Guest ${activeTab + 1} — Document Back (optional)`
                : "Document Back (optional)"
            }
            preview={current.backPreview}
            onChange={(e) => pickFile(e, "back")}
          />
        </div>

        {error && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "13px",
              marginTop: "12px",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "14px",
            background: "rgba(0,128,128,0.2)",
            border: "1px solid rgba(0,128,128,0.5)",
            borderRadius: "10px",
            color: "#33b5b5",
            fontSize: "15px",
            fontWeight: "700",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading..." : "Submit Documents"}
        </button>

        <p
          style={{
            fontSize: "11px",
            color: "#333",
            textAlign: "center",
            marginTop: "12px",
          }}
        >
          Your documents are securely stored and used only for verification.
        </p>
      </div>
    </div>
  );
}

function UploadBox({ label, preview, onChange }) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1e1e1e",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          color: "#555",
          fontWeight: "600",
          marginBottom: "10px",
        }}
      >
        {label}
      </p>
      {preview ? (
        <img
          src={preview}
          alt="preview"
          style={{
            width: "100%",
            maxHeight: "180px",
            objectFit: "contain",
            borderRadius: "8px",
            marginBottom: "10px",
            border: "1px solid #2a2a2a",
          }}
        />
      ) : (
        <div
          style={{
            height: "100px",
            border: "1.5px dashed #2a2a2a",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "10px",
          }}
        >
          <p style={{ color: "#333", fontSize: "13px" }}>No file selected</p>
        </div>
      )}
      <label
        style={{
          display: "block",
          textAlign: "center",
          padding: "8px",
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "8px",
          color: "#666",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        {preview ? "Change Photo" : "Choose Photo"}
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
  },
  wrapper: { width: "100%", maxWidth: "440px" },
  card: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "14px",
    padding: "32px 24px",
    width: "100%",
    maxWidth: "400px",
  },
};
