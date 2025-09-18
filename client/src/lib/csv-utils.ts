export interface CSVRow {
  [key: string]: string;
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim().replace(/"/g, '');
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export function validatePodcastCSVRow(row: CSVRow): string[] {
  const errors: string[] = [];
  
  if (!row['Podcast Title'] && !row['title']) {
    errors.push('Missing podcast title');
  }
  
  if (!row['Podcast Host(s)'] && !row['host']) {
    errors.push('Missing podcast host');
  }
  
  if (!row['Country of Production'] && !row['country']) {
    errors.push('Missing country');
  }
  
  if (!row['Primary Language(s)'] && !row['language']) {
    errors.push('Missing language');
  }
  
  const year = row['Year Launched'] || row['year'];
  if (!year || isNaN(parseInt(year))) {
    errors.push('Missing or invalid year');
  }
  
  return errors;
}
