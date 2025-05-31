# FHIR to Markdown Converter

A Node.js web application that converts FHIR (Fast Healthcare Interoperability Resources) JSON data into human-readable Markdown format. Designed for deployment on DigitalOcean App Platform.

## Features

- 🏥 Convert FHIR JSON patient data to structured Markdown
- 📁 File upload with drag-and-drop support
- 🎯 Sample data for testing
- 📋 Copy converted Markdown to clipboard
- 🔒 Secure file handling with size limits
- 📱 Responsive design for all devices
- ⚡ Fast API endpoints for conversion

## Supported FHIR Resources

- **Patient**: Demographics, contact information, addresses
- **Condition**: Medical conditions with status and onset dates
- **Observation**: Lab results, vital signs with reference ranges
- **Medication/MedicationRequest**: Prescriptions and dosage instructions
- **Encounter**: Medical visits and encounters

## Deployment on DigitalOcean App Platform

### Method 1: Using GitHub (Recommended)

1. **Fork/Clone this repository** to your GitHub account

2. **Create a new app** on DigitalOcean App Platform:
   - Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your GitHub account
   - Select your repository

3. **Configure the app**:
   - **Name**: `fhir-converter` (or your preferred name)
   - **Branch**: `main`
   - **Source Directory**: `/` (root)
   - **Environment**: Node.js
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=8080
   ```

5. **Deploy**: Click "Create Resources" to deploy

### Method 2: Using doctl CLI

1. **Install doctl** and authenticate:
   ```bash
   # Install doctl
   snap install doctl
   
   # Authenticate
   doctl auth init
   ```

2. **Create app spec file** (`.do/app.yaml`):
   ```yaml
   name: fhir-converter
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/fhir-converter
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: PORT
       value: "8080"
   ```

3. **Deploy**:
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open browser** to `http://localhost:3000`

## API Endpoints

### POST `/api/convert`
Upload a FHIR JSON file for conversion.

**Request**: Multipart form data with `fhirFile`
**Response**: 
```json
{
  "success": true,
  "markdown": "# Patient Medical Record...",
  "filename": "patient-data.json"
}
```

### POST `/api/convert-json`
Convert FHIR JSON data directly.

**Request**:
```json
{
  "fhirData": { /* FHIR JSON object */ }
}
```

**Response**:
```json
{
  "success": true,
  "markdown": "# Patient Medical Record..."
}
```

### GET `/health`
Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Security Features

- Helmet.js for security headers
- CORS protection
- File size limits (10MB)
- JSON file type validation
- Input sanitization
- Error handling middleware

## File Structure

```
fhir-converter/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── public/
│   └── index.html        # Frontend interface
├── .do/
│   └── app.yaml          # DigitalOcean App Platform config
└── README.md             # This file
```

## Environment Variables

- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Server port (default: 3000, DigitalOcean uses 8080)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues with:
- **FHIR conversion**: Check the FHIR R4 specification
- **DigitalOcean deployment**: Consult DO App Platform docs
- **App bugs**: Open an issue on GitHub

---

**Built for healthcare data interoperability** 🏥 