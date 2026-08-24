import * as XLSX from 'xlsx';
import type { Student, StudentCreateInput } from '../types';

export interface StudentImportRow {
  rowNumber: number;
  student: StudentCreateInput;
  errors: string[];
  warnings: string[];
  duplicateInFile: boolean;
  duplicateExisting: boolean;
}

export interface StudentExcelResult {
  fileName: string;
  sheetName: string;
  headerRowNumber: number;
  recognizedColumns: string[];
  rows: StudentImportRow[];
}

type StudentField =
  | 'studentCode'
  | 'fullName'
  | 'birthDate'
  | 'gender'
  | 'email'
  | 'phone'
  | 'address'
  | 'status'
  | 'totalScore'
  | 'parentEmail'
  | 'parentPhone'
  | 'note';

const HEADER_ALIASES: Record<StudentField, string[]> = {
  studentCode: ['mã học sinh', 'mã hs', 'ma hoc sinh', 'ma hs', 'mshs', 'student id', 'student code'],
  fullName: ['họ và tên', 'họ tên', 'tên học sinh', 'ho va ten', 'ho ten', 'ten hoc sinh', 'full name', 'fullname'],
  birthDate: ['ngày sinh', 'ngay sinh', 'date of birth', 'birth date', 'dob'],
  gender: ['giới tính', 'gioi tinh', 'gender', 'phái', 'phai'],
  email: ['email', 'email học sinh', 'email hoc sinh', 'student email'],
  phone: ['điện thoại', 'sđt', 'số điện thoại', 'dien thoai', 'sdt', 'so dien thoai', 'phone', 'student phone'],
  address: ['địa chỉ', 'dia chi', 'address'],
  status: ['trạng thái', 'tình trạng', 'trang thai', 'tinh trang', 'status'],
  totalScore: ['điểm khởi tạo', 'điểm ban đầu', 'tổng điểm', 'diem khoi tao', 'diem ban dau', 'tong diem', 'score'],
  parentEmail: ['email phụ huynh', 'email ph', 'email phu huynh', 'parent email'],
  parentPhone: ['sđt phụ huynh', 'số điện thoại phụ huynh', 'sdt phu huynh', 'so dien thoai phu huynh', 'parent phone'],
  note: ['ghi chú', 'ghi chu', 'note', 'notes']
};

const FIELD_LABELS: Record<StudentField, string> = {
  studentCode: 'Mã học sinh',
  fullName: 'Họ và tên',
  birthDate: 'Ngày sinh',
  gender: 'Giới tính',
  email: 'Email',
  phone: 'Điện thoại',
  address: 'Địa chỉ',
  status: 'Trạng thái',
  totalScore: 'Điểm khởi tạo',
  parentEmail: 'Email phụ huynh',
  parentPhone: 'SĐT phụ huynh',
  note: 'Ghi chú'
};

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(HEADER_ALIASES).map(([field, aliases]) => [field, aliases.map(normalizeText)])
) as Record<StudentField, string[]>;

function fieldForHeader(value: unknown): StudentField | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  for (const field of Object.keys(NORMALIZED_ALIASES) as StudentField[]) {
    if (NORMALIZED_ALIASES[field].includes(normalized)) return field;
  }
  return null;
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function normalizePhone(value: unknown): string {
  const text = cellString(value);
  if (!text) return '';
  if (/^\d+(\.0+)?$/.test(text)) return text.replace(/\.0+$/, '');
  return text;
}

function normalizeGender(value: unknown): Student['gender'] {
  const text = normalizeText(value);
  if (!text) return '';
  if (['nam', 'male', 'm'].includes(text)) return 'Nam';
  if (['nu', 'female', 'f'].includes(text)) return 'Nữ';
  if (['khac', 'other'].includes(text)) return 'Khác';
  return '';
}

function two(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${two(value.getMonth() + 1)}-${two(value.getDate())}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${two(parsed.m)}-${two(parsed.d)}`;
  }

  const raw = cellString(value);
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return `${iso[1]}-${two(Number(iso[2]))}-${two(Number(iso[3]))}`;

  const vi = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (vi) return `${vi[3]}-${two(Number(vi[2]))}-${two(Number(vi[1]))}`;

  return '';
}

function validEmail(value: string): boolean {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function identityKey(student: Pick<StudentCreateInput, 'studentCode' | 'fullName' | 'birthDate' | 'email' | 'phone'>): string {
  const code = normalizeText(student.studentCode || '');
  if (code) return `code:${code}`;
  const email = normalizeText(student.email || '');
  if (email) return `email:${email}`;
  const name = normalizeText(student.fullName || '');
  const birthDate = student.birthDate || '';
  if (name && birthDate) return `name-birth:${name}|${birthDate}`;
  const phone = normalizePhone(student.phone || '');
  if (name && phone) return `name-phone:${name}|${phone}`;
  return '';
}

export function studentIdentityKey(student: Student | StudentCreateInput): string {
  return identityKey(student);
}

function findHeaderRow(matrix: unknown[][]): { index: number; fields: Map<StudentField, number> } {
  let bestIndex = -1;
  let bestFields = new Map<StudentField, number>();
  let bestScore = -1;

  matrix.slice(0, 20).forEach((row, rowIndex) => {
    const fields = new Map<StudentField, number>();
    row.forEach((cell, columnIndex) => {
      const field = fieldForHeader(cell);
      if (field && !fields.has(field)) fields.set(field, columnIndex);
    });
    const score = fields.size + (fields.has('fullName') ? 5 : 0);
    if (fields.has('fullName') && score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
      bestFields = fields;
    }
  });

  if (bestIndex < 0) throw new Error('Không tìm thấy cột "Họ và tên" trong 20 dòng đầu của file Excel.');
  return { index: bestIndex, fields: bestFields };
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((cell) => cellString(cell) === '');
}

function getCell(row: unknown[], fields: Map<StudentField, number>, field: StudentField): unknown {
  const index = fields.get(field);
  return index === undefined ? '' : row[index];
}

function parseStudent(row: unknown[], fields: Map<StudentField, number>, rowNumber: number): StudentImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fullName = cellString(getCell(row, fields, 'fullName')).replace(/\s+/g, ' ').trim();
  const birthRaw = getCell(row, fields, 'birthDate');
  const birthDate = toIsoDate(birthRaw);
  const email = cellString(getCell(row, fields, 'email')).toLowerCase();
  const parentEmail = cellString(getCell(row, fields, 'parentEmail')).toLowerCase();
  const genderRaw = getCell(row, fields, 'gender');
  const gender = normalizeGender(genderRaw);
  const scoreRaw = getCell(row, fields, 'totalScore');
  const scoreText = cellString(scoreRaw).replace(',', '.');
  const parsedScore = scoreText ? Number(scoreText) : 100;

  if (!fullName) errors.push('Thiếu họ và tên.');
  if (birthRaw !== '' && !birthDate) warnings.push('Ngày sinh không đúng định dạng; đã để trống.');
  if (cellString(genderRaw) && !gender) warnings.push('Giới tính không nhận diện; đã để trống.');
  if (!validEmail(email)) warnings.push('Email học sinh không đúng định dạng.');
  if (!validEmail(parentEmail)) warnings.push('Email phụ huynh không đúng định dạng.');
  if (scoreText && !Number.isFinite(parsedScore)) warnings.push('Điểm khởi tạo không hợp lệ; dùng 100 điểm.');

  const student: StudentCreateInput = {
    studentCode: cellString(getCell(row, fields, 'studentCode')),
    fullName,
    birthDate,
    gender,
    email,
    phone: normalizePhone(getCell(row, fields, 'phone')),
    address: cellString(getCell(row, fields, 'address')),
    totalScore: Number.isFinite(parsedScore) ? parsedScore : 100,
    status: cellString(getCell(row, fields, 'status')) || 'Đang học',
    note: cellString(getCell(row, fields, 'note')),
    totalStars: 0,
    qualityAvg: 0,
    competencyAvg: 0,
    parentEmail,
    parentPhone: normalizePhone(getCell(row, fields, 'parentPhone'))
  };

  return { rowNumber, student, errors, warnings, duplicateInFile: false, duplicateExisting: false };
}

export async function parseStudentExcel(file: File, existingStudents: Student[]): Promise<StudentExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('File Excel không có worksheet.');

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  const { index: headerIndex, fields } = findHeaderRow(matrix);

  const existingKeys = new Set(existingStudents.map(studentIdentityKey).filter(Boolean));
  const fileKeys = new Set<string>();
  const rows: StudentImportRow[] = [];

  matrix.slice(headerIndex + 1).forEach((row, offset) => {
    if (!Array.isArray(row) || isEmptyRow(row)) return;
    const parsed = parseStudent(row, fields, headerIndex + 2 + offset);
    const key = studentIdentityKey(parsed.student);
    if (key) {
      parsed.duplicateInFile = fileKeys.has(key);
      parsed.duplicateExisting = existingKeys.has(key);
      fileKeys.add(key);
    }
    rows.push(parsed);
  });

  if (rows.length === 0) throw new Error('Không tìm thấy dòng học sinh nào bên dưới hàng tiêu đề.');

  return {
    fileName: file.name,
    sheetName,
    headerRowNumber: headerIndex + 1,
    recognizedColumns: [...fields.keys()].map((field) => FIELD_LABELS[field]),
    rows
  };
}

export function downloadStudentExcelTemplate(): void {
  const headers = [
    'Mã học sinh', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Email', 'Điện thoại',
    'Địa chỉ', 'Trạng thái', 'Điểm khởi tạo', 'Email phụ huynh', 'SĐT phụ huynh', 'Ghi chú'
  ];
  const sample = [
    'HS001', 'Nguyễn Văn An', '15/09/2013', 'Nam', 'an@example.com', '0912345678',
    'Hà Nội', 'Đang học', 100, 'phuhuynh@example.com', '0987654321', 'Học sinh mới'
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sample]);
  worksheet['!cols'] = [
    { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 16 },
    { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 28 }
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');
  XLSX.writeFile(workbook, 'mau-import-hoc-sinh.xlsx');
}
