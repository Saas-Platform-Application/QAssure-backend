const { getFailedEmailsService } = require('../services/failed-emails.service');

const getFailedEmails = async (req, res, next) => {
  try {
    const service = getFailedEmailsService();
    const isSuperAdmin = req.user.isSuperAdmin;
    const tenantId = isSuperAdmin ? null : req.user.tenantId;
    
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await service.getFailedEmails(tenantId, { limit, offset });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const resendEmail = async (req, res, next) => {
  try {
    const service = getFailedEmailsService();
    const isSuperAdmin = req.user.isSuperAdmin;
    const tenantId = isSuperAdmin ? null : req.user.tenantId;
    
    await service.resendEmail(req.params.id, tenantId);
    res.json({ success: true, message: 'Email resent successfully.' });
  } catch (error) {
    next(error);
  }
};

const resendAllEmails = async (req, res, next) => {
  try {
    const service = getFailedEmailsService();
    const isSuperAdmin = req.user.isSuperAdmin;
    const tenantId = isSuperAdmin ? null : req.user.tenantId;
    
    const result = await service.resendAll(tenantId);
    res.json({ success: true, message: `Resent ${result.sentCount} emails. Failed: ${result.failCount}` });
  } catch (error) {
    next(error);
  }
};

const deleteEmail = async (req, res, next) => {
  try {
    const service = getFailedEmailsService();
    const isSuperAdmin = req.user.isSuperAdmin;
    const tenantId = isSuperAdmin ? null : req.user.tenantId;
    
    await service.deleteFailedEmail(req.params.id, tenantId);
    res.json({ success: true, message: 'Deleted failed email from log.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFailedEmails,
  resendEmail,
  resendAllEmails,
  deleteEmail
};
