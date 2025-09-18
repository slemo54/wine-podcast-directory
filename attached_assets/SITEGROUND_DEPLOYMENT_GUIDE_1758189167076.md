# 🍷 Wine Podcast Directory - SiteGround Deployment Guide

## 📋 Overview

This comprehensive guide will walk you through deploying the Wine Podcast Directory system on SiteGround hosting. The system includes a frontend interface, PHP backend API, and MySQL database integration.

### System Components
- **Frontend**: HTML/CSS/JavaScript interface with search and filtering
- **Backend**: PHP REST API with database integration
- **Database**: MySQL with podcast data and analytics
- **Data Pipeline**: CSV import and JS export functionality

---

## 🛠️ Pre-Deployment Checklist

### ✅ Required Information
- [ ] SiteGround hosting account credentials
- [ ] Database credentials (provided in project):
  - **Host**: localhost
  - **Database**: dbzy6z57enkwbn
  - **Username**: ucq0fwugcqhuz
  - **Password**: |p$3i%3o1231
- [ ] Domain name where the application will be hosted
- [ ] FTP/File Manager access to hosting account

### ✅ Files to Deploy
```
📁 Project Files:
├── index.html (main frontend)
├── script.js (frontend logic)
├── styles.css (styling)
├── podcasts-data.js (current data)
└── backend/ (complete PHP system)
    ├── config/database.php
    ├── api/podcasts.php
    ├── api/import-csv.php
    ├── api/export-js.php
    ├── admin/index.php
    └── install.sql
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Database Setup

#### 1.1 Access SiteGround Database
1. Log into your SiteGround hosting account
2. Navigate to **Site Tools** → **Databases** → **MySQL**
3. Verify the database exists:
   - Database name: `dbzy6z57enkwbn`
   - Username: `ucq0fwugcqhuz`

#### 1.2 Import Database Schema
1. Access **phpMyAdmin** from Site Tools
2. Select the database `dbzy6z57enkwbn`
3. Go to **Import** tab
4. Upload the `backend/install.sql` file
5. Click **Go** to execute

```sql
-- Verify installation with this query:
SHOW TABLES;
-- Should show: podcasts, podcast_analytics (optional)

-- Check table structure:
DESCRIBE podcasts;
```

#### 1.3 Test Database Connection
1. Upload `backend/config/database.php` to a temporary location
2. Access it via browser: `yoursite.com/path/database.php?action=test`
3. Should return JSON with connection success

---

### Step 2: Backend Deployment

#### 2.1 Upload Backend Files
Using SiteGround File Manager or FTP:

```
📁 Upload Structure:
public_html/
├── backend/
│   ├── config/
│   │   └── database.php
│   ├── api/
│   │   ├── podcasts.php
│   │   ├── import-csv.php
│   │   └── export-js.php
│   └── admin/
│       ├── index.php
│       ├── login.php
│       └── includes/
```

#### 2.2 Set File Permissions
```bash
# Via SSH or File Manager:
chmod 755 backend/
chmod 755 backend/api/
chmod 644 backend/api/*.php
chmod 644 backend/config/*.php
```

#### 2.3 Test API Endpoints
Test each endpoint after upload:

```bash
# Test main API:
curl "https://yoursite.com/backend/api/podcasts.php?limit=5"

# Expected response:
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {...}
  }
}
```

---

### Step 3: Frontend Deployment

#### 3.1 Upload Frontend Files
```
📁 Upload to public_html/:
├── index.html
├── script.js
├── styles.css
└── podcasts-data.js
```

#### 3.2 Configure API URLs
Edit `script.js` to point to your domain:

```javascript
// Update this line in script.js:
const API_BASE_URL = 'https://yoursite.com/backend/api';

// Instead of:
const API_BASE_URL = 'http://localhost/backend/api';
```

#### 3.3 Test Frontend
1. Access `https://yoursite.com`
2. Verify page loads with podcast data
3. Test search functionality
4. Test category filters

---

### Step 4: Data Import Process

#### 4.1 Prepare CSV Data
Ensure your CSV file has these columns:
```csv
title,host,country,language,year,active,categories,audience,format,duration,frequency,episodes,website,instagram,linkedin,facebook,spotify,youtube,apple,soundcloud,amazon,iheart,description,sample_episode,recommendations,logo,email
```

#### 4.2 Import via Admin Panel
1. Access `https://yoursite.com/backend/admin/`
2. Log in with admin credentials
3. Use CSV import functionality
4. Verify data import success

#### 4.3 Alternative: Direct Database Import
Using phpMyAdmin:
```sql
LOAD DATA INFILE '/path/to/podcasts.csv'
INTO TABLE podcasts
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

---

### Step 5: Generate JavaScript Data File

#### 5.1 Run Export Process
Access the export endpoint:
```bash
# This should generate podcasts-data.js:
curl "https://yoursite.com/backend/api/export-js.php"
```

#### 5.2 Verify Generated File
Check that `podcasts-data.js` contains:
```javascript
const podcastsData = [
  {
    "id": 1,
    "title": "Podcast Name",
    // ... other fields
  }
  // ... more podcasts
];
```

#### 5.3 Update Frontend Reference
Ensure `index.html` loads the generated file:
```html
<script src="podcasts-data.js"></script>
<script src="script.js"></script>
```

---

## 🔧 Configuration & Optimization

### PHP Configuration
Add to `.htaccess` in backend folder:
```apache
# Enable error reporting (remove in production)
php_flag display_errors on
php_value error_reporting E_ALL

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY

# API CORS settings
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

### Database Optimization
```sql
-- Add indexes for better performance:
ALTER TABLE podcasts ADD INDEX idx_country (country);
ALTER TABLE podcasts ADD INDEX idx_language (language);
ALTER TABLE podcasts ADD INDEX idx_year (year);
ALTER TABLE podcasts ADD INDEX idx_active (active);

-- Full-text search index:
ALTER TABLE podcasts ADD FULLTEXT(title, host, description, categories);
```

### Caching Configuration
Add to main `.htaccess`:
```apache
# Cache static files
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>

# Compress files
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript
</IfModule>
```

---

## 🧪 Testing Deployment

### Automated Testing
Run the test suites after deployment:

```bash
# 1. Backend API Tests:
php tests/backend-api-tests.php https://yoursite.com

# 2. Database Tests:
php tests/database-integration-tests.php

# 3. Frontend Tests:
# Open: https://yoursite.com/tests/frontend-integration-tests.html

# 4. E2E Tests:
# Open: https://yoursite.com/tests/e2e-test-suite.html
```

### Manual Testing Checklist
- [ ] Main page loads within 3 seconds
- [ ] Search functionality works
- [ ] Category filters function properly
- [ ] Episode length filter works
- [ ] Podcast details modal opens
- [ ] Favorites system works
- [ ] Mobile responsive design
- [ ] All API endpoints respond correctly
- [ ] Database queries execute successfully

---

## 📊 Monitoring & Maintenance

### Performance Monitoring
1. **Page Load Speed**: Use Google PageSpeed Insights
2. **API Response Times**: Monitor via server logs
3. **Database Performance**: Check slow query log
4. **Error Monitoring**: Review PHP error logs

### Regular Maintenance Tasks
- **Weekly**: Review error logs
- **Monthly**: Update podcast data via CSV import
- **Quarterly**: Database optimization and cleanup
- **Annually**: Security updates and dependency updates

### Log Locations (SiteGround)
```
📁 Important Log Files:
├── /logs/error_log (PHP errors)
├── /logs/access_log (HTTP requests)
└── MySQL slow query log (via phpMyAdmin)
```

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### Issue: Database Connection Failed
```
Error: "Database connection failed"
```
**Solution**:
1. Verify database credentials in `backend/config/database.php`
2. Check if database exists in SiteGround panel
3. Ensure database user has proper permissions

#### Issue: API Returns 500 Error
```
HTTP 500 Internal Server Error
```
**Solution**:
1. Check PHP error log: `/logs/error_log`
2. Verify file permissions (755 for directories, 644 for files)
3. Ensure all required PHP extensions are enabled

#### Issue: Frontend Not Loading Data
```
Error: "No podcasts found"
```
**Solution**:
1. Verify `podcasts-data.js` is generated and accessible
2. Check browser console for JavaScript errors
3. Confirm API endpoints are accessible

#### Issue: Search Not Working
```
Search returns no results
```
**Solution**:
1. Check full-text search index exists:
   ```sql
   SHOW INDEX FROM podcasts WHERE Index_type = 'FULLTEXT';
   ```
2. Verify search parameters in API call
3. Test search query directly in database

#### Issue: Import CSV Fails
```
Error importing CSV data
```
**Solution**:
1. Verify CSV format matches expected columns
2. Check file upload permissions
3. Review CSV for special characters or encoding issues

### Debug Mode
Enable debug mode by adding to `backend/config/database.php`:
```php
// Add at top of file:
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Add logging:
function debugLog($message) {
    error_log(date('Y-m-d H:i:s') . ' - ' . $message . PHP_EOL, 3, 'debug.log');
}
```

---

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Remove debug/test files
- [ ] Disable PHP error display
- [ ] Set proper file permissions
- [ ] Enable HTTPS
- [ ] Configure security headers
- [ ] Regular database backups
- [ ] Update PHP version regularly

### Backup Strategy
```bash
# Database Backup:
mysqldump -u username -p dbzy6z57enkwbn > backup_$(date +%Y%m%d).sql

# File Backup:
tar -czf website_backup_$(date +%Y%m%d).tar.gz public_html/
```

### Security Headers
Add to main `.htaccess`:
```apache
# Security Headers
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

---

## 📞 Support & Resources

### SiteGround Resources
- **Documentation**: [SiteGround Help Center](https://www.siteground.com/support/)
- **Site Tools**: Access via hosting panel
- **24/7 Support**: Available via chat/ticket

### Project-Specific Support
- **Test Suites**: Use provided test files for validation
- **Error Logs**: Monitor regularly for issues
- **Performance**: Use built-in monitoring tools

### Useful Commands
```bash
# Check PHP version:
php -v

# Test database connection:
mysql -h localhost -u ucq0fwugcqhuz -p dbzy6z57enkwbn

# Check disk space:
df -h

# Monitor error logs:
tail -f /logs/error_log
```

---

## ✅ Post-Deployment Verification

### Final Checklist
1. **Environment Status**:
   - [ ] Database: 🟢 Connected
   - [ ] API: 🟢 Responding
   - [ ] Frontend: 🟢 Loading
   - [ ] Search: 🟢 Working

2. **Performance**:
   - [ ] Page load: < 3 seconds
   - [ ] API response: < 1 second
   - [ ] Search response: < 2 seconds

3. **Functionality**:
   - [ ] All filters working
   - [ ] Modal dialogs functioning
   - [ ] Mobile responsive
   - [ ] Error handling graceful

4. **Security**:
   - [ ] HTTPS enabled
   - [ ] Security headers set
   - [ ] Debug mode disabled
   - [ ] File permissions correct

### Success Metrics
- **Uptime**: 99.9%
- **Page Load Speed**: < 3 seconds
- **API Response Time**: < 1 second
- **Search Accuracy**: Relevant results
- **Mobile Compatibility**: All features work

---

## 🎉 Deployment Complete!

Your Wine Podcast Directory is now successfully deployed on SiteGround. The system includes:

✅ **Complete Frontend** with search and filtering
✅ **Robust Backend API** with database integration
✅ **Data Management** via CSV import/export
✅ **Performance Optimization** for fast loading
✅ **Comprehensive Testing** suite for validation

**Next Steps**:
1. Monitor performance and error logs
2. Plan regular data updates
3. Consider additional features based on user feedback
4. Implement analytics for usage tracking

For ongoing support, refer to the troubleshooting section and use the provided test suites to validate system health.