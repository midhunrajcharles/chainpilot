// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainPilotAI AuditLog
 * @notice Immutable on-chain registry of AI-generated security audit report hashes.
 * @dev Stores SHA-256 hashes of risk reports. Cannot be modified or deleted.
 */
contract AuditLog {
    // ─── Structs ──────────────────────────────────────────────────────────────

    struct AuditEntry {
        bytes32 reportHash;      // SHA-256 hash of the full risk report JSON
        address contractAudited; // Contract that was analyzed
        address initiator;       // Wallet that requested the audit
        uint256 timestamp;       // Block timestamp
        uint8 severity;          // 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
        bool exists;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    mapping(bytes32 => AuditEntry) public auditEntries;
    bytes32[] public allHashes;
    address public immutable trustedLogger;

    // ─── Events ───────────────────────────────────────────────────────────────

    event AuditLogged(
        bytes32 indexed reportHash,
        address indexed contractAudited,
        address indexed initiator,
        uint256 timestamp,
        uint8 severity
    );

    // ─── Errors ───────────────────────────────────────────────────────────────

    error UnauthorizedLogger();
    error DuplicateReport();
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _trustedLogger) {
        if (_trustedLogger == address(0)) revert ZeroAddress();
        trustedLogger = _trustedLogger;
    }

    // ─── Core Function ────────────────────────────────────────────────────────

    /**
     * @notice Log a new audit report hash.
     * @param reportHash SHA-256 hash of the AI security report
     * @param contractAddress The contract that was analyzed
     * @param severity Risk severity: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
     */
    function logAudit(
        bytes32 reportHash,
        address contractAddress,
        uint8 severity
    ) external {
        if (msg.sender != trustedLogger) revert UnauthorizedLogger();
        if (auditEntries[reportHash].exists) revert DuplicateReport();
        if (contractAddress == address(0)) revert ZeroAddress();

        auditEntries[reportHash] = AuditEntry({
            reportHash: reportHash,
            contractAudited: contractAddress,
            initiator: tx.origin,
            timestamp: block.timestamp,
            severity: severity,
            exists: true
        });

        allHashes.push(reportHash);

        emit AuditLogged(reportHash, contractAddress, tx.origin, block.timestamp, severity);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Verify an audit entry exists for a given hash.
     */
    function verifyAudit(bytes32 reportHash) external view returns (bool, AuditEntry memory) {
        AuditEntry memory entry = auditEntries[reportHash];
        return (entry.exists, entry);
    }

    /**
     * @notice Get total number of audits logged.
     */
    function totalAudits() external view returns (uint256) {
        return allHashes.length;
    }

    /**
     * @notice Get all audit hashes (paginated).
     */
    function getAuditHashes(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory)
    {
        uint256 end = offset + limit > allHashes.length ? allHashes.length : offset + limit;
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allHashes[i];
        }
        return result;
    }
}
