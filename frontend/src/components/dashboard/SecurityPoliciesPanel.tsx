"use client";
import { PoliciesApiClient, PolicyRule, SecurityPolicy } from "@/utils/api/policiesApi";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaPlus,
  FaShieldAlt,
  FaSync,
  FaTimesCircle,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from "react-icons/fa";

const RULE_TYPE_OPTIONS: { value: PolicyRule["type"]; label: string; description: string }[] = [
  { value: "MAX_TRANSACTION_VALUE", label: "Max Transaction Value", description: "Block/alert on transfers exceeding a set ETH limit" },
  { value: "DAILY_SPEND_LIMIT", label: "Daily Spend Limit", description: "Total ETH you can send per day" },
  { value: "WHITELIST_ONLY", label: "Whitelist Only", description: "Only allow transfers to whitelisted addresses" },
  { value: "REQUIRE_COOL_DOWN", label: "Require Cooldown", description: "Minimum minutes between consecutive transactions" },
  { value: "BLOCK_UNVERIFIED_CONTRACTS", label: "Block Unverified Contracts", description: "Block interactions with unverified contracts" },
  { value: "ALERT_NEW_ADDRESS", label: "Alert on New Address", description: "Get alerted when sending to a first-time recipient" },
  { value: "CUSTOM_ANOMALY_THRESHOLD", label: "Custom Anomaly Threshold", description: "Trigger action when anomaly score exceeds threshold" },
];

function RuleParamFields({ type, params, onChange }: {
  type: PolicyRule["type"];
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
}) {
  if (type === "MAX_TRANSACTION_VALUE") {
    return (
      <div className="flex items-center gap-2">
        <label className="text-slate-400 text-sm w-28">Max (ETH):</label>
        <input
          type="number"
          step="0.01"
          value={params.maxEth ?? ""}
          onChange={(e) => onChange({ ...params, maxEth: parseFloat(e.target.value) })}
          placeholder="e.g. 1.0"
          className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
    );
  }
  if (type === "DAILY_SPEND_LIMIT") {
    return (
      <div className="flex items-center gap-2">
        <label className="text-slate-400 text-sm w-28">Limit (ETH/day):</label>
        <input
          type="number"
          step="0.01"
          value={params.limitEth ?? ""}
          onChange={(e) => onChange({ ...params, limitEth: parseFloat(e.target.value) })}
          placeholder="e.g. 5.0"
          className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
    );
  }
  if (type === "REQUIRE_COOL_DOWN") {
    return (
      <div className="flex items-center gap-2">
        <label className="text-slate-400 text-sm w-28">Cooldown (min):</label>
        <input
          type="number"
          value={params.cooldownMinutes ?? ""}
          onChange={(e) => onChange({ ...params, cooldownMinutes: parseInt(e.target.value, 10) })}
          placeholder="e.g. 60"
          className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
    );
  }
  if (type === "CUSTOM_ANOMALY_THRESHOLD") {
    return (
      <div className="flex items-center gap-2">
        <label className="text-slate-400 text-sm w-28">Score (0–100):</label>
        <input
          type="number"
          min={0}
          max={100}
          value={params.threshold ?? ""}
          onChange={(e) => onChange({ ...params, threshold: parseInt(e.target.value, 10) })}
          placeholder="e.g. 70"
          className="flex-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
    );
  }
  return <p className="text-slate-500 text-sm">No additional parameters needed</p>;
}

function emptyRule(): PolicyRule {
  return {
    type: "MAX_TRANSACTION_VALUE",
    enabled: true,
    params: { maxEth: 1 },
    action: "ALERT",
    notifyVia: ["email"],
  };
}

interface PolicyFormState {
  name: string;
  description: string;
  enabled: boolean;
  rules: PolicyRule[];
  whitelistedAddresses: string;
}

export default function SecurityPoliciesPanel() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address ?? "";

  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<PolicyFormState>({
    name: "",
    description: "",
    enabled: true,
    rules: [emptyRule()],
    whitelistedAddresses: "",
  });

  useEffect(() => {
    if (walletAddress) loadPolicies();
  }, [walletAddress]);

  const loadPolicies = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await PoliciesApiClient.list(walletAddress);
      if (res.success && res.data) setPolicies(res.data as SecurityPolicy[]);
    } catch (err) {
      console.error("loadPolicies error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", enabled: true, rules: [emptyRule()], whitelistedAddresses: "" });
    setShowForm(true);
  };

  const openEdit = (policy: SecurityPolicy) => {
    setEditingId(policy._id);
    setForm({
      name: policy.name,
      description: policy.description ?? "",
      enabled: policy.enabled,
      rules: policy.rules.length ? policy.rules : [emptyRule()],
      whitelistedAddresses: (policy.whitelistedAddresses ?? []).join(", "),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!walletAddress || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        walletAddress,
        name: form.name.trim(),
        description: form.description.trim(),
        enabled: form.enabled,
        rules: form.rules,
        whitelistedAddresses: form.whitelistedAddresses
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      };

      let res;
      if (editingId) {
        res = await PoliciesApiClient.update(walletAddress, editingId, payload);
      } else {
        res = await PoliciesApiClient.create(walletAddress, payload);
      }

      if (res.success) {
        setShowForm(false);
        await loadPolicies();
      }
    } catch (err) {
      console.error("handleSave error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (policy: SecurityPolicy) => {
    await PoliciesApiClient.toggle(walletAddress, policy._id, !policy.enabled);
    setPolicies((prev) => prev.map((p) => p._id === policy._id ? { ...p, enabled: !p.enabled } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy?")) return;
    await PoliciesApiClient.remove(walletAddress, id);
    setPolicies((prev) => prev.filter((p) => p._id !== id));
  };

  const addRule = () => setForm((f) => ({ ...f, rules: [...f.rules, emptyRule()] }));
  const removeRule = (i: number) => setForm((f) => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));
  const updateRule = (i: number, patch: Partial<PolicyRule>) =>
    setForm((f) => ({ ...f, rules: f.rules.map((r, idx) => idx === i ? { ...r, ...patch } : r) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Security Policies</h2>
          <p className="text-slate-400 text-sm mt-1">
            Custom rules to protect your wallet from unwanted transactions
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-[#C6A75E]/40 hover:bg-[#C6A75E]/10 hover:border-[#C6A75E] text-[#C6A75E] tracking-widest uppercase rounded-none transition-all duration-500 text-xs"
        >
          <FaPlus /> New Policy
        </button>
      </div>

      {/* Policy List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <FaSync className="text-slate-400 text-2xl animate-spin" />
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 bg-white/3 border border-white/10 rounded-2xl">
          <FaShieldAlt className="text-slate-500 text-5xl mx-auto mb-4" />
          <p className="text-white font-medium text-lg">No security policies yet</p>
          <p className="text-slate-400 text-sm mt-2 mb-6 max-w-sm mx-auto">
            Create your first policy to protect transactions — block large transfers, limit daily spending, or whitelist trusted addresses.
          </p>
          <button
            onClick={openCreate}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all duration-200 inline-flex items-center gap-2"
          >
            <FaPlus /> Create First Policy
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => (
            <div
              key={policy._id}
              className={`bg-white/5 border rounded-2xl p-5 transition-all duration-300 ${
                policy.enabled ? "border-white/10" : "border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{policy.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        policy.enabled
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-slate-500/10 border-slate-500/30 text-slate-400"
                      }`}
                    >
                      {policy.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  {policy.description && (
                    <p className="text-slate-400 text-sm mt-1">{policy.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {policy.rules.map((rule, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-1 rounded-lg border ${
                          rule.action === "BLOCK"
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                        }`}
                      >
                        {rule.action === "BLOCK" ? "🚫" : "⚠️"}{" "}
                        {RULE_TYPE_OPTIONS.find((o) => o.value === rule.type)?.label ?? rule.type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(policy)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title={policy.enabled ? "Disable" : "Enable"}
                  >
                    {policy.enabled ? (
                      <FaToggleOn className="text-2xl text-green-400 hover:text-green-300" />
                    ) : (
                      <FaToggleOff className="text-2xl text-slate-500 hover:text-slate-300" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(policy)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(policy._id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-white font-semibold text-lg">
                {editingId ? "Edit Policy" : "Create Security Policy"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <FaTimesCircle />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">Policy Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Daily Spend Limit"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder:text-slate-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder:text-slate-500"
                />
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center gap-3">
                <label className="text-slate-300 text-sm font-medium">Active:</label>
                <button
                  onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                  className="text-2xl"
                >
                  {form.enabled ? (
                    <FaToggleOn className="text-green-400 hover:text-green-300" />
                  ) : (
                    <FaToggleOff className="text-slate-500 hover:text-slate-300" />
                  )}
                </button>
              </div>

              {/* Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-slate-300 text-sm font-medium">Rules</label>
                  <button
                    onClick={addRule}
                    className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <FaPlus /> Add Rule
                  </button>
                </div>
                <div className="space-y-4">
                  {form.rules.map((rule, i) => (
                    <div key={i} className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
                      {/* Row 1: Type + Remove */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <select
                            value={rule.type}
                            onChange={(e) => {
                              const t = e.target.value as PolicyRule["type"];
                              const defaults: Record<string, any> = {
                                MAX_TRANSACTION_VALUE: { maxEth: 1 },
                                DAILY_SPEND_LIMIT: { limitEth: 5 },
                                WHITELIST_ONLY: {},
                                REQUIRE_COOL_DOWN: { cooldownMinutes: 60 },
                                BLOCK_UNVERIFIED_CONTRACTS: {},
                                ALERT_NEW_ADDRESS: {},
                                CUSTOM_ANOMALY_THRESHOLD: { threshold: 70 },
                              };
                              updateRule(i, { type: t, params: defaults[t] ?? {} });
                            }}
                            className="w-full bg-slate-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                          >
                            {RULE_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <p className="text-slate-500 text-xs mt-1">
                            {RULE_TYPE_OPTIONS.find((o) => o.value === rule.type)?.description}
                          </p>
                        </div>
                        {form.rules.length > 1 && (
                          <button
                            onClick={() => removeRule(i)}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>

                      {/* Row 2: Params */}
                      <RuleParamFields
                        type={rule.type}
                        params={rule.params}
                        onChange={(params) => updateRule(i, { params })}
                      />

                      {/* Row 3: Action */}
                      <div className="flex items-center gap-3">
                        <label className="text-slate-400 text-sm">Action:</label>
                        <div className="flex gap-2">
                          {(["ALERT", "BLOCK"] as const).map((a) => (
                            <button
                              key={a}
                              onClick={() => updateRule(i, { action: a })}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                                rule.action === a
                                  ? a === "BLOCK"
                                    ? "bg-red-500/20 border-red-500/50 text-red-400"
                                    : "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                              }`}
                            >
                              {a === "BLOCK" ? "🚫 Block" : "⚠️ Alert"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Whitelist */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">
                  Whitelisted Addresses <span className="text-slate-500 font-normal">(comma-separated)</span>
                </label>
                <textarea
                  value={form.whitelistedAddresses}
                  onChange={(e) => setForm((f) => ({ ...f, whitelistedAddresses: e.target.value }))}
                  placeholder="0x123..., 0xabc..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder:text-slate-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-[#C6A75E]/40 hover:bg-[#C6A75E]/10 hover:border-[#C6A75E] disabled:opacity-40 disabled:cursor-not-allowed text-[#C6A75E] tracking-widest uppercase rounded-none text-xs transition-all duration-500"
              >
                {saving ? (
                  <><FaSync className="animate-spin" /> Saving...</>
                ) : (
                  <><FaCheckCircle /> {editingId ? "Save Changes" : "Create Policy"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
