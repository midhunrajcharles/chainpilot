"use client";
import { ChainPilotApiClient, Team } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaEdit, FaPlus, FaTimes, FaTrash, FaUserPlus, FaUsers } from "react-icons/fa";

export default function TeamWorkspace() {
  const { user } = usePrivy();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const isFetchingRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: [] as Array<{ walletAddress: string; name: string }>,
  });

  const walletAddress = user?.wallet?.address || "";

  const fetchTeams = useCallback(async () => {
    if (isFetchingRef.current || !walletAddress) return;
    
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const response = await ChainPilotApiClient.teams.getTeams(walletAddress);
      
      if (response.success && response.data) {
        setTeams(response.data);
      } else {
        setError(response.error || "Failed to fetch teams");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchTeams();
    }
  }, [walletAddress, fetchTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await ChainPilotApiClient.teams.createTeam(walletAddress, formData);
      
      if (response.success) {
        setShowCreateModal(false);
        setFormData({ name: "", description: "", members: [] });
        fetchTeams();
      } else {
        setError(response.error || "Failed to create team");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    try {
      const response = await ChainPilotApiClient.teams.updateTeam(walletAddress, editingTeam._id, formData);
      
      if (response.success) {
        setEditingTeam(null);
        setFormData({ name: "", description: "", members: [] });
        fetchTeams();
      } else {
        setError(response.error || "Failed to update team");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      const response = await ChainPilotApiClient.teams.deleteTeam(walletAddress, teamId);
      
      if (response.success) {
        fetchTeams();
      } else {
        setError(response.error || "Failed to delete team");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || "",
      members: team.members.map(m => ({ walletAddress: m.walletAddress, name: m.name })),
    });
  };

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, { walletAddress: "", name: "" }],
    });
  };

  const removeMember = (index: number) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index),
    });
  };

  const updateMember = (index: number, field: 'name' | 'walletAddress', value: string) => {
    const updatedMembers = [...formData.members];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setFormData({
      ...formData,
      members: updatedMembers,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Team & Workspace
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Create teams and manage group transactions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300 w-full sm:w-auto"
        >
          <FaPlus className="text-sm" />
          Create Team
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {teams.map((team) => (
          <div key={team._id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <FaUsers className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{team.name}</h3>
                  <p className="text-slate-400 text-sm">
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(team)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg transition-all duration-300"
                  title="Edit team"
                >
                  <FaEdit className="text-slate-400 hover:text-white text-sm" />
                </button>
                <button
                  onClick={() => handleDeleteTeam(team._id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-all duration-300"
                  title="Delete team"
                >
                  <FaTrash className="text-red-400 hover:text-red-300 text-sm" />
                </button>
              </div>
            </div>

            {team.description && (
              <p className="text-slate-300 text-sm mb-4">{team.description}</p>
            )}

            <div className="space-y-2">
              <h4 className="text-slate-400 text-sm font-medium">Members:</h4>
              <div className="space-y-1">
                {team.members.slice(0, 3).map((member, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-slate-300">{member.name}</span>
                    <span className="text-slate-500 text-xs">
                      {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                    </span>
                  </div>
                ))}
                {team.members.length > 3 && (
                  <div className="text-slate-400 text-xs">
                    +{team.members.length - 3} more members
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg text-white transition-all duration-300">
                <FaUserPlus className="text-sm" />
                Manage Team
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {teams.length === 0 && (
        <div className="text-center py-12">
          <FaUsers className="text-6xl text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Teams Yet</h3>
          <p className="text-slate-400 mb-6">
            Create your first team to start managing group transactions and approvals.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
          >
            Create Your First Team
          </button>
        </div>
      )}

      {/* Create/Edit Team Modal */}
      {(showCreateModal || editingTeam) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-6">
              {editingTeam ? "Edit Team" : "Create New Team"}
            </h3>
            
            <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Team Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
                  placeholder="Enter team name"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Team Members</label>
                <div className="space-y-3">
                  {formData.members.map((member, index) => (
                    <div key={index} className="p-3 bg-slate-800/30 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updateMember(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300 text-sm"
                            placeholder="Member name"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMember(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300"
                          title="Remove member"
                        >
                          <FaTimes className="text-sm" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={member.walletAddress}
                        onChange={(e) => updateMember(index, 'walletAddress', e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300 text-sm"
                        placeholder="Wallet address (0x...)"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMember}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg text-white transition-all duration-300"
                  >
                    <FaUserPlus className="text-sm" />
                    Add Member
                  </button>
                  {formData.members.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      No members added yet. You can add members now or later.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
                >
                  {editingTeam ? "Update Team" : "Create Team"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTeam(null);
                    setFormData({ name: "", description: "", members: [] });
                  }}
                  className="px-4 py-3 bg-slate-800/20 hover:bg-slate-700/40 border border-slate-600/30 hover:border-slate-500/50 rounded-xl text-slate-300 hover:text-white transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
