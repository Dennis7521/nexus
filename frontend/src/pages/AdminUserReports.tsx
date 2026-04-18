import { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, Clock, AlertTriangle, User, Calendar, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { useToast, ToastContainer } from '../components/Toast';

interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  exchange_id: number | null;
  reason: string;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  reporter_name: string;
  reporter_email: string;
  reporter_student_id: string;
  reported_user_name: string;
  reported_user_email: string;
  reported_user_student_id: string;
  reviewer_name: string | null;
  skill_offered_title: string | null;
  skill_requested_title: string | null;
}

interface ReportStats {
  total_reports: number;
  pending_reports: number;
  under_review_reports: number;
  resolved_reports: number;
  dismissed_reports: number;
  total_reported_users: number;
}

export const AdminUserReports: React.FC = () => {
  const { toasts, success, error, removeToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ id: string; name: string; type: 'reporter' | 'reported' } | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageLog, setMessageLog] = useState<Array<{ timestamp: string; recipient: string; message: string; admin: string }>>([]);

  useEffect(() => {
    loadReports();
    loadStats();
  }, [filterStatus]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const url = filterStatus === 'all' 
        ? '/admin/reports' 
        : `/admin/reports?status=${filterStatus}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/admin/reports/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateReportStatus = async (reportId: number, status: string) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('adminToken');
      await axios.put(`/admin/reports/${reportId}/status`, {
        status,
        adminNotes: adminNotes || null
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Reload reports and stats
      await loadReports();
      await loadStats();
      
      setShowDetailModal(false);
      setSelectedReport(null);
      setAdminNotes('');
      success('Report status updated successfully');
    } catch (err) {
      console.error('Error updating report status:', err);
      error('Failed to update report status');
    } finally {
      setIsUpdating(false);
    }
  };

  const loadMessageLog = async (reportId: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/admin/reports/${reportId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessageLog(response.data);
    } catch (err) {
      console.error('Error loading message log:', err);
      setMessageLog([]);
    }
  };

  const viewReportDetails = (report: Report) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    loadMessageLog(report.id);
    setShowDetailModal(true);
  };

  const openMessageModal = (userId: string, userName: string, type: 'reporter' | 'reported') => {
    setMessageRecipient({ id: userId, name: userName, type });
    setMessageContent('');
    setShowMessageModal(true);
  };

  const sendAdminMessage = async () => {
    if (!messageRecipient || !messageContent.trim()) {
      error('Please enter a message');
      return;
    }

    try {
      setIsSendingMessage(true);
      const token = localStorage.getItem('adminToken');
      await axios.post('/admin/send-message', {
        recipientId: messageRecipient.id,
        message: messageContent.trim(),
        reportId: selectedReport?.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      success(`Message sent to ${messageRecipient.name}`);
      
      // Reload message log to show the new message
      if (selectedReport) {
        await loadMessageLog(selectedReport.id);
      }
      
      setShowMessageModal(false);
      setMessageRecipient(null);
      setMessageContent('');
    } catch (err) {
      console.error('Error sending message:', err);
      error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: { bg: 'var(--warning-100)', color: 'var(--warning-700)', icon: Clock },
      resolved: { bg: 'var(--success-100)', color: 'var(--success-700)', icon: CheckCircle },
      dismissed: { bg: 'var(--gray-100)', color: 'var(--gray-700)', icon: XCircle }
    };

    const style = styles[status as keyof typeof styles] || styles.pending;
    const Icon = style.icon;

    return (
      <span 
        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
        style={{ background: style.bg, color: style.color }}
      >
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ background: 'var(--green-50)', minHeight: '100vh' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--green-900)' }}>
            User Reports Management
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Review and manage user misconduct reports
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <div 
              className="p-4 rounded-lg"
              style={{ 
                background: 'var(--white)',
                border: '1px solid var(--gray-200)'
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                Total Reports
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-800)' }}>
                {stats.total_reports}
              </p>
            </div>

            <div 
              className="p-4 rounded-lg"
              style={{ 
                background: 'var(--white)',
                border: '1px solid var(--gray-200)'
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                Pending
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-800)' }}>
                {stats.pending_reports}
              </p>
            </div>


            <div 
              className="p-4 rounded-lg"
              style={{ 
                background: 'var(--white)',
                border: '1px solid var(--gray-200)'
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                Resolved
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-800)' }}>
                {stats.resolved_reports}
              </p>
            </div>

            <div 
              className="p-4 rounded-lg"
              style={{ 
                background: 'var(--white)',
                border: '1px solid var(--gray-200)'
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                Dismissed
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-800)' }}>
                {stats.dismissed_reports}
              </p>
            </div>

            <div 
              className="p-4 rounded-lg"
              style={{ 
                background: 'var(--white)',
                border: '1px solid var(--gray-200)'
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                Reported Users
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-800)' }}>
                {stats.total_reported_users}
              </p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'resolved', 'dismissed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
              style={{
                background: filterStatus === status ? 'var(--green-800)' : 'var(--white)',
                color: filterStatus === status ? 'var(--white)' : 'var(--gray-700)',
                border: `1px solid ${filterStatus === status ? 'var(--green-800)' : 'var(--gray-200)'}`
              }}
            >
              {status === 'all' ? 'All Reports' : status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Reports Table */}
        <div 
          className="rounded-lg overflow-hidden"
          style={{ 
            background: 'var(--white)',
            border: '1px solid var(--gray-200)'
          }}
        >
          {loading ? (
            <div className="p-12 text-center">
              <p style={{ color: 'var(--gray-600)' }}>Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <Flag className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gray-400)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--gray-900)' }}>
                No reports found
              </p>
              <p style={{ color: 'var(--gray-600)' }}>
                {filterStatus === 'all' 
                  ? 'No user reports have been submitted yet'
                  : `No ${filterStatus.replace('_', ' ')} reports`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                      REPORTED USER
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                      REPORTER
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                      REASON
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                      DATE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: 'var(--gray-700)' }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr 
                      key={report.id}
                      style={{ borderBottom: '1px solid var(--gray-100)' }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--danger-100)', color: 'var(--danger-700)' }}
                          >
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--gray-900)' }}>
                              {report.reported_user_name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--gray-500)' }}>
                              {report.reported_user_student_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm" style={{ color: 'var(--gray-900)' }}>
                            {report.reporter_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--gray-500)' }}>
                            {report.reporter_student_id}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: 'var(--warning-600)' }} />
                          <span className="text-sm" style={{ color: 'var(--gray-900)' }}>
                            {report.reason}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" style={{ color: 'var(--gray-400)' }} />
                          <span className="text-sm" style={{ color: 'var(--gray-600)' }}>
                            {formatDate(report.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewReportDetails(report)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background: 'var(--green-800)',
                            color: 'var(--white)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-700)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-800)'}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--white)' }}
          >
            {/* Modal Header */}
            <div 
              className="p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flag className="w-8 h-8" style={{ color: 'var(--green-800)' }} />
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                      Report Details
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                      Report ID: #{selectedReport.id}
                    </p>
                  </div>
                </div>
                {getStatusBadge(selectedReport.status)}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Reported User Info */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    REPORTED USER
                  </h3>
                  <button
                    onClick={() => openMessageModal(
                      String(selectedReport.reported_user_id),
                      selectedReport.reported_user_name,
                      'reported'
                    )}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--green-800)',
                      color: 'var(--white)',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--green-700)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--green-800)';
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact
                  </button>
                </div>
                <div 
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--danger-50)', border: '1px solid var(--danger-200)' }}
                >
                  <p className="font-medium mb-1" style={{ color: 'var(--gray-900)' }}>
                    {selectedReport.reported_user_name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Student ID: {selectedReport.reported_user_student_id}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Email: {selectedReport.reported_user_email}
                  </p>
                </div>
              </div>

              {/* Reporter Info */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    REPORTER
                  </h3>
                  <button
                    onClick={() => openMessageModal(
                      String(selectedReport.reporter_id),
                      selectedReport.reporter_name,
                      'reporter'
                    )}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--green-800)',
                      color: 'var(--white)',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--green-700)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--green-800)';
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact
                  </button>
                </div>
                <div 
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
                >
                  <p className="font-medium mb-1" style={{ color: 'var(--gray-900)' }}>
                    {selectedReport.reporter_name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Student ID: {selectedReport.reporter_student_id}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Email: {selectedReport.reporter_email}
                  </p>
                </div>
              </div>

              {/* Report Details */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gray-700)' }}>
                  REPORT DETAILS
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                      Reason
                    </p>
                    <p className="font-medium" style={{ color: 'var(--gray-900)' }}>
                      {selectedReport.reason}
                    </p>
                  </div>
                  {selectedReport.description && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                        Description
                      </p>
                      <p style={{ color: 'var(--gray-700)' }}>
                        {selectedReport.description}
                      </p>
                    </div>
                  )}
                  {selectedReport.exchange_id && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                        Related Exchange
                      </p>
                      <p style={{ color: 'var(--gray-700)' }}>
                        Exchange ID: {selectedReport.exchange_id}
                        {selectedReport.skill_offered_title && (
                          <span> - {selectedReport.skill_offered_title}</span>
                        )}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--gray-600)' }}>
                      Submitted
                    </p>
                    <p style={{ color: 'var(--gray-700)' }}>
                      {formatDate(selectedReport.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Log - Always visible */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gray-700)' }}>
                  ADMIN COMMUNICATION LOG
                </h3>
                {messageLog.length > 0 ? (
                  <div className="space-y-3">
                    {messageLog.map((log, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg"
                        style={{ background: 'var(--green-50)', border: '1px solid var(--green-200)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" style={{ color: 'var(--green-700)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--green-700)' }}>
                              Message to {log.recipient}
                            </span>
                          </div>
                          <span className="text-xs" style={{ color: 'var(--gray-500)' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--gray-700)' }}>
                          {log.message}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                          Sent by: {log.admin}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="p-4 rounded-lg text-center"
                    style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}
                  >
                    <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--gray-400)' }} />
                    <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                      No messages sent yet
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--gray-500)' }}>
                      Use the "Contact" buttons above to send messages to users
                    </p>
                  </div>
                )}
              </div>

              {/* Review Info */}
              {selectedReport.reviewed_by && (
                <div 
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--info-50)', border: '1px solid var(--info-200)' }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--info-700)' }}>
                    Reviewed by: {selectedReport.reviewer_name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--info-600)' }}>
                    {selectedReport.reviewed_at && formatDate(selectedReport.reviewed_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-6 border-t flex gap-3 justify-end"
              style={{ borderColor: 'var(--gray-200)' }}
            >
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                  setAdminNotes('');
                }}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  background: 'var(--gray-100)',
                  color: 'var(--gray-700)'
                }}
              >
                Cancel
              </button>
              
              {selectedReport.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateReportStatus(selectedReport.id, 'dismissed')}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--green-800)',
                      color: 'var(--white)'
                    }}
                  >
                    {isUpdating ? 'Updating...' : 'Dismiss'}
                  </button>
                  <button
                    onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                    disabled={isUpdating}
                    className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--green-800)',
                      color: 'var(--white)'
                    }}
                  >
                    {isUpdating ? 'Updating...' : 'Resolved'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Message Modal */}
      {showMessageModal && messageRecipient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-2xl max-w-lg w-full"
            style={{ background: 'var(--white)' }}
          >
            {/* Modal Header */}
            <div className="p-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-8 h-8" style={{ color: 'var(--green-800)' }} />
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                    Contact {messageRecipient.type === 'reporter' ? 'Reporter' : 'Reported User'}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                    Send message to {messageRecipient.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                  Message
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--gray-200)',
                    background: 'var(--white)',
                    color: 'var(--gray-900)',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageRecipient(null);
                  setMessageContent('');
                }}
                disabled={isSendingMessage}
                className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  background: '#D1D5DB',
                  color: '#2C2C54'
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendAdminMessage}
                disabled={!messageContent.trim() || isSendingMessage}
                className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  background: messageContent.trim() && !isSendingMessage ? '#145A32' : '#D1D5DB',
                  color: '#FFFFFF'
                }}
              >
                {isSendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserReports;
