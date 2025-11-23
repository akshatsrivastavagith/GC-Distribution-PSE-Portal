# 🔐 Security Setup Guide

## ⚠️ IMPORTANT: Before Pushing to GitHub

This project contains sensitive credentials that must NOT be pushed to GitHub.

## 🚫 Files That Are Protected (.gitignore)

The following files are automatically excluded from Git:

### Sensitive Configuration Files:
- ✅ `go-backend/config/environments.json` - API credentials (TEST & PROD)
- ✅ `go-backend/config/users.json` - User passwords
- ✅ `go-backend/config/activity_log.json` - User activity logs
- ✅ `go-backend/config/upload_history.json` - Upload records
- ✅ `go-backend/config/password_change_requests.json` - Password requests

### Storage & Uploads:
- ✅ `go-backend/storage/` - All uploaded files
- ✅ `*.csv`, `*.xlsx`, `*.xls` - All spreadsheet files
- ✅ `*.log` - All log files

### Environment & Build Files:
- ✅ `.env` files
- ✅ `node_modules/`
- ✅ Go binaries
- ✅ Build directories

## ✅ Safe to Commit

These files are template/example files and are safe to commit:

- ✅ `go-backend/config/environments.json.example`
- ✅ `go-backend/config/users.json.example`
- ✅ `go-backend/config/clients.json` (no sensitive data)
- ✅ `go-backend/config/README.md`
- ✅ All source code files
- ✅ Documentation files

## 🔧 Setup for New Developers

When cloning this repository, developers need to:

1. **Create configuration files from examples:**
   ```bash
   cd go-backend/config
   cp environments.json.example environments.json
   cp users.json.example users.json
   ```

2. **Fill in actual credentials:**
   - Edit `environments.json` with real API credentials
   - Edit `users.json` with real user accounts
   - **Get credentials from team lead or secure credential storage**

3. **Verify files are ignored:**
   ```bash
   git status
   # Should NOT show environments.json or users.json
   ```

## 🔍 Verify Before Committing

Always check what you're about to commit:

```bash
# See what will be committed
git status

# Review changes
git diff

# Make sure NO sensitive files are listed
git ls-files | grep -E "(environments|users|password|activity|upload_history)\.json$"
# This should return NOTHING (empty output)
```

## 🛡️ Security Checklist

Before pushing to GitHub:

- [ ] Verified `.gitignore` is present
- [ ] Confirmed sensitive files are NOT in `git status`
- [ ] Example files (`.example`) are included
- [ ] No API keys, passwords, or tokens in source code
- [ ] No hardcoded credentials anywhere
- [ ] README files explain setup process
- [ ] Team members know where to get credentials

## 🚨 What to Do If Credentials Are Leaked

If you accidentally commit sensitive credentials:

1. **Immediately rotate all credentials**:
   - Change API passwords
   - Change user passwords
   - Update all configuration files

2. **Remove from Git history**:
   ```bash
   # Use git-filter-repo or BFG Repo-Cleaner
   # DON'T use git filter-branch (deprecated)
   ```

3. **Force push the cleaned history**:
   ```bash
   git push --force
   ```

4. **Notify team members** to:
   - Pull the latest changes
   - Update their local credentials
   - Delete their old clones if needed

## 📝 Current Configuration Structure

```
go-backend/config/
├── README.md                           ✅ Safe to commit
├── clients.json                        ✅ Safe to commit
├── environments.json.example           ✅ Safe to commit (template)
├── users.json.example                  ✅ Safe to commit (template)
├── environments.json                   ❌ IGNORED (contains credentials)
├── users.json                          ❌ IGNORED (contains passwords)
├── activity_log.json                   ❌ IGNORED (auto-generated)
├── upload_history.json                 ❌ IGNORED (auto-generated)
└── password_change_requests.json       ❌ IGNORED (auto-generated)
```

## 🔐 Production Credentials

**PRODUCTION credentials should ONLY be:**
- Stored in secure credential management systems (e.g., AWS Secrets Manager, HashiCorp Vault)
- Accessed through environment variables in production
- Known only to authorized personnel
- Rotated regularly

**NEVER:**
- Commit production credentials to Git
- Share production credentials via email/Slack
- Store production credentials in plain text on your machine
- Use production credentials for testing

## 📚 Additional Resources

- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git: gitignore documentation](https://git-scm.com/docs/gitignore)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## ✅ You're Protected!

With the `.gitignore` file in place, your sensitive credentials are automatically protected from being committed to Git. Just make sure to:

1. Never force-add ignored files (`git add -f`)
2. Review `git status` before committing
3. Keep this security guide updated

**Stay secure! 🔒**

