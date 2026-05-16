import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { Plus, Pencil, Trash2, X, Phone, Mail, Upload, RefreshCw } from "lucide-react";

const COLOR_PALETTE = [
  "#008080", "#06b6d4", "#f59e0b", "#10b981",
  "#8b5cf6", "#ef4444", "#ec4899", "#f97316",
];

const BLANK = {
  name: "",
  phone: "",
  email: "",
  ownership_percent: "",
  color: "#008080",
  display_order: 0,
  image_url: "",
};

export default function Owners({ isMobile }) {
  const { owners, ownersLoading, addOwner, updateOwner, deleteOwner } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const imgInputRef = useRef(null);
  const latestImageUrl = useRef("");

  const pad = isMobile ? "16px" : "32px";
  const gap = isMobile ? "14px" : "24px";

  const totalPct = owners.reduce((s, o) => s + (Number(o.ownership_percent) || 0), 0);

  const openAdd = () => {
    setForm({ ...BLANK, display_order: owners.length + 1 });
    setEditId(null);
    setImgPreview(null);
    latestImageUrl.current = "";
    setShowModal(true);
  };

  const openEdit = (o) => {
    setForm({
      name: o.name || "",
      phone: o.phone || "",
      email: o.email || "",
      ownership_percent: o.ownership_percent ?? "",
      color: o.color || "#008080",
      display_order: o.display_order ?? 0,
      image_url: o.image_url || "",
    });
    setEditId(o.id);
    setImgPreview(o.image_url || null);
    latestImageUrl.current = o.image_url || "";
    setShowModal(true);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setImgUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("owners").upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("owners").getPublicUrl(path);
      latestImageUrl.current = urlData.publicUrl;
      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
      setImgPreview(urlData.publicUrl);
    }
    setImgUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      ownership_percent: Number(form.ownership_percent) || 0,
      color: form.color,
      display_order: Number(form.display_order) || 0,
      image_url: latestImageUrl.current || form.image_url || null,
    };
    if (editId) await updateOwner(editId, payload);
    else await addOwner(payload);
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    await deleteOwner(deleteId);
    setDeleteId(null);
  };

  return (
    <div style={{ padding: pad, display: "flex", flexDirection: "column", gap }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "700", color: "#f0f0f0" }}>Owners</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "4px" }}>
            {owners.length} member{owners.length !== 1 ? "s" : ""} · Manage property ownership
          </p>
        </div>
        <button onClick={openAdd} style={styles.addBtn}>
          <Plus size={16} />
          {!isMobile && "Add Owner"}
        </button>
      </div>

      {/* Ownership summary bar */}
      {owners.length > 0 && (
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", color: "#555", fontWeight: "600", letterSpacing: "0.06em" }}>TOTAL OWNERSHIP</span>
            <span style={{
              fontSize: "13px", fontWeight: "700",
              color: Math.abs(totalPct - 100) < 0.1 ? "#10b981" : "#f59e0b",
            }}>
              {totalPct.toFixed(2)}%
              {Math.abs(totalPct - 100) < 0.1 ? " ✓" : " (should be 100%)"}
            </span>
          </div>
          {/* Stacked bar */}
          <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", height: "10px", background: "#1a1a1a" }}>
            {owners.map((o) => (
              <div
                key={o.id}
                title={`${o.name}: ${o.ownership_percent}%`}
                style={{
                  width: `${Math.min(Number(o.ownership_percent) || 0, 100)}%`,
                  background: o.color || "#008080",
                  transition: "width 0.3s",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "10px" }}>
            {owners.map((o) => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: o.color || "#008080" }} />
                <span style={{ fontSize: "12px", color: "#888" }}>{o.name}</span>
                <span style={{ fontSize: "12px", color: o.color || "#008080", fontWeight: "700" }}>{Number(o.ownership_percent).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {ownersLoading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#444", fontSize: "14px" }}>Loading...</div>
      )}

      {/* Empty */}
      {!ownersLoading && owners.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#444", fontSize: "14px" }}>
          No owners yet. Add the first owner.
        </div>
      )}

      {/* Owner Cards Grid */}
      {!ownersLoading && owners.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : owners.length === 1 ? "1fr" : owners.length === 2 ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "14px" : "20px",
        }}>
          {owners.map((o) => {
            const initials = o.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={o.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "16px", overflow: "hidden" }}>
                {/* Color stripe */}
                <div style={{ height: "4px", background: o.color || "#008080" }} />

                <div style={{ padding: "24px 20px" }}>
                  {/* Avatar + Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    {/* Avatar */}
                    <div style={{
                      width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden",
                      border: `2px solid ${o.color || "#008080"}44`,
                      background: (o.color || "#008080") + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "24px", fontWeight: "700", color: o.color || "#008080",
                      flexShrink: 0,
                    }}>
                      {o.image_url ? (
                        <img src={o.image_url} alt={o.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : initials}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => openEdit(o)} style={styles.iconBtn}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(o.id)} style={styles.iconBtnDanger}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Name + ownership */}
                  <div style={{ marginBottom: "14px" }}>
                    <p style={{ fontSize: "18px", fontWeight: "700", color: "#f0f0f0", marginBottom: "4px" }}>{o.name}</p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: (o.color || "#008080") + "18", border: `1px solid ${(o.color || "#008080")}40`, borderRadius: "20px", padding: "3px 10px" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: o.color || "#008080" }} />
                      <span style={{ fontSize: "13px", fontWeight: "700", color: o.color || "#008080" }}>
                        {Number(o.ownership_percent).toFixed(2)}% owner
                      </span>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {o.phone ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Phone size={13} color="#444" />
                        <span style={{ fontSize: "13px", color: "#888" }}>{o.phone}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Phone size={13} color="#2a2a2a" />
                        <span style={{ fontSize: "13px", color: "#333" }}>No phone</span>
                      </div>
                    )}
                    {o.email ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mail size={13} color="#444" />
                        <span style={{ fontSize: "13px", color: "#888", wordBreak: "break-all" }}>{o.email}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mail size={13} color="#2a2a2a" />
                        <span style={{ fontSize: "13px", color: "#333" }}>No email</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: "480px", borderRadius: isMobile ? "16px 16px 0 0" : "16px", position: isMobile ? "fixed" : "relative", bottom: isMobile ? 0 : "auto", left: isMobile ? 0 : "auto", right: isMobile ? 0 : "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#f0f0f0" }}>
                {editId ? "Edit Owner" : "Add Owner"}
              </h2>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "70vh", overflowY: "auto" }}>
              {/* Avatar upload */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{
                  width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  background: (form.color || "#008080") + "22",
                  border: `2px solid ${form.color || "#008080"}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", fontWeight: "700", color: form.color || "#008080",
                }}>
                  {imgPreview ? (
                    <img src={imgPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (form.name?.[0]?.toUpperCase() || "?")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); e.target.value = ""; }} />
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    disabled={imgUploading}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", background: "rgba(0,128,128,0.1)", border: "1px solid rgba(0,128,128,0.3)", borderRadius: "8px", color: "#33b5b5", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                  >
                    {imgUploading ? <><RefreshCw size={12} /> Uploading...</> : <><Upload size={12} /> Upload Photo</>}
                  </button>
                  {imgPreview && (
                    <button
                      type="button"
                      onClick={() => { setImgPreview(null); latestImageUrl.current = ""; setForm((f) => ({ ...f, image_url: "" })); }}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", color: "#ef4444", fontSize: "12px", cursor: "pointer" }}
                    >
                      <X size={11} /> Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={styles.label}>Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Owner name"
                  style={styles.input}
                />
              </div>

              {/* Phone + Email */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={styles.label}>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 00000 00000"
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@email.com"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Ownership % + Display order */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={styles.label}>Ownership % <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="number"
                    min="0" max="100" step="0.01"
                    value={form.ownership_percent}
                    onChange={(e) => setForm({ ...form, ownership_percent: e.target.value })}
                    placeholder="33.33"
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                    placeholder="1"
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={styles.label}>Color</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: "32px", height: "32px", borderRadius: "8px", background: c, border: "none",
                        cursor: "pointer", outline: form.color === c ? `3px solid #fff` : "none",
                        outlineOffset: "2px", transition: "outline 0.1s",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving || imgUploading || !form.name.trim()} style={styles.saveBtn}>
                {saving ? "Saving..." : editId ? "Save Changes" : "Add Owner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div style={styles.overlay}>
          <div style={{ ...styles.modal, maxWidth: "360px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "14px" }}>👤</div>
            <p style={{ fontWeight: "700", color: "#f0f0f0", fontSize: "16px", marginBottom: "8px" }}>Delete Owner?</p>
            <p style={{ color: "#555", fontSize: "13px", marginBottom: "24px" }}>
              This owner will be removed. Their expense history won't be deleted.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteId(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleDelete} style={{ ...styles.saveBtn, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  addBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "10px 16px", background: "linear-gradient(135deg, #008080, #00a0a0)",
    border: "none", borderRadius: "8px", color: "#fff", fontWeight: "600",
    fontSize: "14px", cursor: "pointer", flexShrink: 0,
  },
  iconBtn: {
    padding: "7px", borderRadius: "7px", border: "1px solid #2a2a2a",
    background: "#1a1a1a", color: "#888", cursor: "pointer", display: "flex",
  },
  iconBtnDanger: {
    padding: "7px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.2)",
    background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", display: "flex",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300,
  },
  modal: {
    background: "#111", border: "1px solid #222",
    padding: "24px", width: "100%",
  },
  closeBtn: {
    background: "none", border: "none", color: "#555", cursor: "pointer", padding: "4px", display: "flex",
  },
  label: { fontSize: "12px", color: "#666", fontWeight: "500", display: "block", marginBottom: "6px" },
  input: {
    width: "100%", padding: "10px 12px", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "8px", color: "#e0e0e0", fontSize: "14px", outline: "none",
    boxSizing: "border-box", colorScheme: "dark",
  },
  cancelBtn: {
    flex: 1, padding: "10px", background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: "8px", color: "#888", cursor: "pointer", fontSize: "14px",
  },
  saveBtn: {
    flex: 1, padding: "10px", background: "rgba(0,128,128,0.2)", border: "1px solid rgba(0,128,128,0.4)",
    borderRadius: "8px", color: "#33b5b5", fontWeight: "600", fontSize: "14px", cursor: "pointer",
  },
};
