const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// FHIR conversion endpoint
app.post('/api/convert', upload.single('fhirFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fhirData = JSON.parse(req.file.buffer.toString());
    const markdown = convertFHIRToMarkdown(fhirData);
    
    res.json({ 
      success: true, 
      markdown: markdown,
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(400).json({ 
      error: 'Failed to convert FHIR data: ' + error.message 
    });
  }
});

// JSON conversion endpoint (for direct JSON input)
app.post('/api/convert-json', (req, res) => {
  try {
    const { fhirData } = req.body;
    
    if (!fhirData) {
      return res.status(400).json({ error: 'No FHIR data provided' });
    }

    const markdown = convertFHIRToMarkdown(fhirData);
    
    res.json({ 
      success: true, 
      markdown: markdown 
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(400).json({ 
      error: 'Failed to convert FHIR data: ' + error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// FHIR to Markdown conversion function
function convertFHIRToMarkdown(fhirData) {
  let markdown = '# Patient Medical Record\n\n';
  
  // Handle different FHIR formats
  let entries = [];
  if (fhirData.entry) {
      entries = fhirData.entry;
  } else if (fhirData.resourceType) {
      entries = [{ resource: fhirData }];
  } else if (Array.isArray(fhirData)) {
      entries = fhirData.map(item => ({ resource: item }));
  }

  // Group resources by type
  const resourceGroups = {
      Patient: [],
      Observation: [],
      Condition: [],
      Medication: [],
      MedicationRequest: [],
      Encounter: []
  };

  entries.forEach(entry => {
      const resource = entry.resource;
      if (resource && resource.resourceType) {
          if (resourceGroups[resource.resourceType]) {
              resourceGroups[resource.resourceType].push(resource);
          }
      }
  });

  // Convert each resource type
  if (resourceGroups.Patient.length > 0) {
      markdown += formatPatients(resourceGroups.Patient);
  }

  if (resourceGroups.Condition.length > 0) {
      markdown += formatConditions(resourceGroups.Condition);
  }

  if (resourceGroups.Observation.length > 0) {
      markdown += formatObservations(resourceGroups.Observation);
  }

  if (resourceGroups.Medication.length > 0 || resourceGroups.MedicationRequest.length > 0) {
      markdown += formatMedications([...resourceGroups.Medication, ...resourceGroups.MedicationRequest]);
  }

  if (resourceGroups.Encounter.length > 0) {
      markdown += formatEncounters(resourceGroups.Encounter);
  }

  return markdown;
}

function formatPatients(patients) {
  let md = '## 👤 Patient Demographics\n\n';
  
  patients.forEach(patient => {
      md += '### Patient Information\n\n';
      
      // Name
      if (patient.name && patient.name[0]) {
          const name = patient.name[0];
          const fullName = `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
          if (fullName) md += `**Name:** ${fullName}\n\n`;
      }
      
      // ID
      if (patient.id) {
          md += `**Patient ID:** ${patient.id}\n\n`;
      }
      
      // Birth Date & Age
      if (patient.birthDate) {
          md += `**Birth Date:** ${patient.birthDate}\n\n`;
          const age = calculateAge(patient.birthDate);
          md += `**Age:** ${age} years\n\n`;
      }
      
      // Gender
      if (patient.gender) {
          md += `**Gender:** ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}\n\n`;
      }
      
      // Contact Info
      if (patient.telecom) {
          md += '**Contact Information:**\n';
          patient.telecom.forEach(contact => {
              if (contact.system && contact.value) {
                  md += `- ${contact.system.charAt(0).toUpperCase() + contact.system.slice(1)}: ${contact.value}\n`;
              }
          });
          md += '\n';
      }
      
      // Address
      if (patient.address && patient.address[0]) {
          const addr = patient.address[0];
          md += '**Address:**\n';
          if (addr.line) md += `${addr.line.join(', ')}\n`;
          const cityState = [addr.city, addr.state].filter(Boolean).join(', ');
          if (cityState) md += `${cityState} ${addr.postalCode || ''}\n`;
          if (addr.country) md += `${addr.country}\n`;
          md += '\n';
      }
  });
  
  return md + '---\n\n';
}

function formatConditions(conditions) {
  let md = '## 🏥 Medical Conditions\n\n';
  
  conditions.forEach((condition, index) => {
      md += `### Condition ${index + 1}\n\n`;
      
      // Condition name
      if (condition.code && condition.code.text) {
          md += `**Condition:** ${condition.code.text}\n\n`;
      } else if (condition.code && condition.code.coding && condition.code.coding[0]) {
          md += `**Condition:** ${condition.code.coding[0].display || condition.code.coding[0].code}\n\n`;
      }
      
      // Clinical Status
      if (condition.clinicalStatus && condition.clinicalStatus.coding) {
          md += `**Status:** ${condition.clinicalStatus.coding[0].code}\n\n`;
      }
      
      // Onset Date
      if (condition.onsetDateTime) {
          md += `**Onset Date:** ${formatDate(condition.onsetDateTime)}\n\n`;
      }
      
      // Severity
      if (condition.severity && condition.severity.text) {
          md += `**Severity:** ${condition.severity.text}\n\n`;
      }
  });
  
  return md + '---\n\n';
}

function formatObservations(observations) {
  let md = '## 🔬 Lab Results & Vital Signs\n\n';
  
  // Group observations by category
  const vitals = observations.filter(obs => 
      obs.category && obs.category.some(cat => 
          cat.coding && cat.coding.some(code => code.code === 'vital-signs')
      )
  );
  
  const labs = observations.filter(obs => 
      obs.category && obs.category.some(cat => 
          cat.coding && cat.coding.some(code => code.code === 'laboratory')
      )
  );
  
  const others = observations.filter(obs => !vitals.includes(obs) && !labs.includes(obs));

  if (vitals.length > 0) {
      md += '### Vital Signs\n\n';
      md += formatObservationGroup(vitals);
  }

  if (labs.length > 0) {
      md += '### Laboratory Results\n\n';
      md += formatObservationGroup(labs);
  }

  if (others.length > 0) {
      md += '### Other Observations\n\n';
      md += formatObservationGroup(others);
  }
  
  return md + '---\n\n';
}

function formatObservationGroup(observations) {
  let md = '';
  
  observations.forEach(obs => {
      // Observation name
      let obsName = 'Unknown Observation';
      if (obs.code && obs.code.text) {
          obsName = obs.code.text;
      } else if (obs.code && obs.code.coding && obs.code.coding[0]) {
          obsName = obs.code.coding[0].display || obs.code.coding[0].code;
      }
      
      // Value
      let value = 'No value recorded';
      if (obs.valueQuantity) {
          value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit || obs.valueQuantity.code || ''}`;
      } else if (obs.valueString) {
          value = obs.valueString;
      } else if (obs.valueCodeableConcept && obs.valueCodeableConcept.text) {
          value = obs.valueCodeableConcept.text;
      }
      
      // Date
      let date = '';
      if (obs.effectiveDateTime) {
          date = ` (${formatDate(obs.effectiveDateTime)})`;
      }
      
      md += `- **${obsName}:** ${value}${date}\n`;
      
      // Reference range
      if (obs.referenceRange && obs.referenceRange[0]) {
          const range = obs.referenceRange[0];
          let rangeText = '';
          if (range.low && range.high) {
              rangeText = `${range.low.value}-${range.high.value} ${range.low.unit || ''}`;
          }
          if (rangeText) {
              md += `  - *Reference Range: ${rangeText}*\n`;
          }
      }
  });
  
  return md + '\n';
}

function formatMedications(medications) {
  let md = '## 💊 Medications\n\n';
  
  medications.forEach((med, index) => {
      md += `### Medication ${index + 1}\n\n`;
      
      // Medication name
      let medName = 'Unknown Medication';
      if (med.medicationCodeableConcept && med.medicationCodeableConcept.text) {
          medName = med.medicationCodeableConcept.text;
      } else if (med.medicationCodeableConcept && med.medicationCodeableConcept.coding && med.medicationCodeableConcept.coding[0]) {
          medName = med.medicationCodeableConcept.coding[0].display || med.medicationCodeableConcept.coding[0].code;
      } else if (med.code && med.code.text) {
          medName = med.code.text;
      }
      
      md += `**Medication:** ${medName}\n\n`;
      
      // Status
      if (med.status) {
          md += `**Status:** ${med.status}\n\n`;
      }
      
      // Dosage
      if (med.dosageInstruction && med.dosageInstruction[0]) {
          const dosage = med.dosageInstruction[0];
          if (dosage.text) {
              md += `**Dosage:** ${dosage.text}\n\n`;
          }
      }
      
      // Authored date
      if (med.authoredOn) {
          md += `**Prescribed:** ${formatDate(med.authoredOn)}\n\n`;
      }
  });
  
  return md + '---\n\n';
}

function formatEncounters(encounters) {
  let md = '## 🏥 Medical Encounters\n\n';
  
  encounters.forEach((encounter, index) => {
      md += `### Encounter ${index + 1}\n\n`;
      
      // Encounter type
      if (encounter.type && encounter.type[0] && encounter.type[0].text) {
          md += `**Type:** ${encounter.type[0].text}\n\n`;
      }
      
      // Status
      if (encounter.status) {
          md += `**Status:** ${encounter.status}\n\n`;
      }
      
      // Class
      if (encounter.class && encounter.class.display) {
          md += `**Class:** ${encounter.class.display}\n\n`;
      }
      
      // Period
      if (encounter.period) {
          if (encounter.period.start) {
              md += `**Start:** ${formatDate(encounter.period.start)}\n\n`;
          }
          if (encounter.period.end) {
              md += `**End:** ${formatDate(encounter.period.end)}\n\n`;
          }
      }
      
      // Reason
      if (encounter.reasonCode && encounter.reasonCode[0] && encounter.reasonCode[0].text) {
          md += `**Reason:** ${encounter.reasonCode[0].text}\n\n`;
      }
  });
  
  return md + '---\n\n';
}

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
  }
  
  return age;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`FHIR Converter server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 