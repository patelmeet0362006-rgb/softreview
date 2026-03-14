/**
 * SoftReview Backend
 * - Serves static files (index.html, review.html, admin.html, css, etc.)
 * - Stores reviews in data/reviews-data.json
 * - API: submit review, admin stats, list/approve/reject/delete reviews
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews-data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize reviews file if missing
if (!fs.existsSync(REVIEWS_FILE)) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify([], null, 2), 'utf8');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ─── Helpers ─────────────────────────────────────────────────────────────
function readReviews() {
  try {
    const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeReviews(reviews) {
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const SOFTWARE_DISPLAY = {
  figma: 'Figma',
  notion: 'Notion',
  vscode: 'VS Code',
  slack: 'Slack',
  'adobe-xd': 'Adobe XD',
  other: 'Other'
};

// ─── POST /api/reviews — Submit a new review (from review.html) ────────────
app.post('/api/reviews', (req, res) => {
  const body = req.body || {};
  const softwareKey = (body.softwareName || '').toLowerCase();
  const softwareDisplay = body.customSoftware?.trim() || SOFTWARE_DISPLAY[softwareKey] || body.softwareName || 'Unknown';

  const review = {
    id: generateId(),
    name: (body.reviewerName || '').trim(),
    email: (body.reviewerEmail || '').trim(),
    software: softwareDisplay,
    rating: Math.min(5, Math.max(1, Number(body.overallRating) || 0)),
    review: (body.reviewBody || '').trim(),
    title: (body.reviewTitle || '').trim(),
    role: (body.reviewerRole || '').trim(),
    category: body.category || '',
    duration: body.duration || '',
    easeRating: body.easeRating || 0,
    valueRating: body.valueRating || 0,
    supportRating: body.supportRating || 0,
    pros: body.pros || '',
    cons: body.cons || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (!review.name || !review.email || !review.review) {
    return res.status(400).json({ success: false, message: 'Name, email and review body are required.' });
  }

  const reviews = readReviews();
  reviews.unshift(review);
  writeReviews(reviews);

  res.status(201).json({ success: true, message: 'Review submitted. It will appear after moderation.' });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────
app.get('/api/admin/stats', (req, res) => {
  const reviews = readReviews();
  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length
  };
  res.json({ success: true, stats });
});

// ─── GET /api/admin/reviews?status=all|pending|approved|rejected ───────────
app.get('/api/admin/reviews', (req, res) => {
  const status = (req.query.status || 'all').toLowerCase();
  let reviews = readReviews();

  if (status !== 'all') {
    reviews = reviews.filter(r => r.status === status);
  }

  res.json({ success: true, reviews });
});

// ─── PATCH /api/admin/reviews/:id — Approve or Reject ──────────────────────
app.patch('/api/admin/reviews/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const reviews = readReviews();
  const idx = reviews.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Review not found.' });
  }

  reviews[idx].status = status;
  writeReviews(reviews);
  res.json({ success: true });
});

// ─── DELETE /api/admin/reviews/:id ─────────────────────────────────────────
app.delete('/api/admin/reviews/:id', (req, res) => {
  const { id } = req.params;
  const all = readReviews();
  const reviews = all.filter(r => r.id !== id);
  if (reviews.length === all.length) {
    return res.status(404).json({ success: false, message: 'Review not found.' });
  }
  writeReviews(reviews);
  res.json({ success: true });
});

// ─── Start server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('SoftReview server running at http://localhost:' + PORT);
  console.log('  - Website:  http://localhost:' + PORT + '/index.html');
  console.log('  - Review:   http://localhost:' + PORT + '/review.html');
  console.log('  - Admin:    http://localhost:' + PORT + '/admin.html');
});
