const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const runPython = require('../utils/runPython');
const { generateRzpid } = require('../utils/rzpid');

const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'stock_uploads');
const PROC_ID_FILE = path.join(STORAGE_DIR, 'procurement_batch_id.txt');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function writeJSON(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

exports.startUpload = async (req, res, io) => {
  try {
    const file = req.file;
    const body = req.body; // contains: email, env, client, amountType, rzpCommission, password

    if (!file) return res.status(400).json({ success: false, message: 'File required' });

    // create run folder
    const timestamp = new Date().toISOString().replace(/:/g,'-').split('.')[0];
    const runId = `${path.parse(file.originalname).name}_${timestamp}`;
    const runFolder = path.join(UPLOADS_DIR, runId);
    fs.mkdirSync(runFolder, { recursive: true });

    // move uploaded file into run folder as raw.csv
    const rawPath = path.join(runFolder, 'raw.csv');
    fs.renameSync(file.path, rawPath);

    // simple meta
    const meta = {
      runId,
      fileName: file.originalname,
      user: body.email || 'unknown',
      env: body.env || 'PROD',
      client: JSON.parse(body.client || '{}'),
      amountType: body.amountType || 'rupee',
      rzpCommissionInput: body.rzpCommission || '0'
    };
    writeJSON(path.join(runFolder, 'meta.json'), meta);

    // generate procurement id (append to global file)
    let procId = generateRzpid();
    fs.appendFileSync(PROC_ID_FILE, `${procId} ${file.originalname}\n`);
    fs.writeFileSync(path.join(runFolder, 'procurement_batch_id.txt'), procId);

    // create control.json
    writeJSON(path.join(runFolder, 'control.json'), { state: 'running' });

    // transform CSV: we'll spawn a small Python helper that reads raw.csv and emits transformed.csv
    // For simplicity we'll call the controlled voucher script directly with args.
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, '..', 'scripts', 'voucher_upload_controlled.py');

    // Prepare args: username password csv_path
    // Fetch credentials for env & script from config/credentials.json
    const credsPath = path.join(__dirname, '..', 'config', 'credentials.json');
    let creds = {};
    try { creds = JSON.parse(fs.readFileSync(credsPath, 'utf8')); } catch(e){ }

    const envKey = (body.env || 'PROD').toUpperCase();
    // default credential fallback
    const username = (creds[envKey] && creds[envKey].username) || body.username || 'rmp_offers';
    const password = (creds[envKey] && creds[envKey].password) || body.password || '';

    // rzp commission final (multiply user input by 100)
    const rzpCommission = Math.round(Number(body.rzpCommission || 0) * 100);

    // spawn python
    const args = [username, password, rawPath, runFolder, String(rzpCommission)];

    // start streaming
    const child = spawn(pythonCmd, [scriptPath, ...args]);

    // pipe child's stdout/stderr to a logfile and socket
    const logStream = fs.createWriteStream(path.join(runFolder, 'terminal_output.log'), { flags: 'a' });

    child.stdout.on('data', (data) => {
      const line = data.toString();
      logStream.write(line);
      io.emit(`run_log:${runId}`, { line });
    });

    child.stderr.on('data', (data) => {
      const line = data.toString();
      logStream.write(line);
      io.emit(`run_log:${runId}`, { line });
    });

    child.on('close', (code) => {
      logStream.write(`\nProcess exited with code ${code}\n`);
      io.emit(`run_finished:${runId}`, { code });
    });

    // return run id and run folder path
    return res.json({ success: true, runId, runFolder });
  } catch (e) {
    console.error('startUpload error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.controlRun = (req, res) => {
  const runId = req.params.runId;
  const { action } = req.body; // action: pause | resume | stop

  const runFolder = path.join(__dirname, '..', 'storage', 'stock_uploads', runId);
  const controlPath = path.join(runFolder, 'control.json');

  if (!fs.existsSync(controlPath)) return res.status(404).json({ success: false, message: 'Run not found' });

  try {
    const control = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
    if (action === 'pause') control.state = 'paused';
    else if (action === 'resume') control.state = 'running';
    else if (action === 'stop') control.state = 'stopped';

    fs.writeFileSync(controlPath, JSON.stringify(control, null, 2));
    return res.json({ success: true, state: control.state });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Cannot update control' });
  }
};

