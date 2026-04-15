import * as XLSX from 'xlsx';

/**
 * Interface for specifying a sheet to be exported in a workbook
 */
export interface ExportSheetDef {
  sheetName: string;
  data: any[];
  columns: { header: string; key: string }[];
}

/**
 * Formats a generic array of objects to only include the specified columns 
 * and maps the keys to the provided headers.
 */
function prepareDataForExport(data: any[], columns: ExportSheetDef['columns']) {
  return data.map((item) => {
    const formattedItem: Record<string, any> = {};
    columns.forEach((col) => {
      // Handle nested keys if needed (e.g., 'user.name'), though simple keys are typical
      formattedItem[col.header] = item[col.key];
    });
    return formattedItem;
  });
}

/**
 * Exports a single sheet of data to an Excel (.xlsx) file
 * 
 * @param filename Name of the file (should include .xlsx extension)
 * @param sheetName Name of the sheet inside the workbook
 * @param data Array of objects to export
 * @param columns Array of column definitions mapping headers to data keys
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  data: any[],
  columns: ExportSheetDef['columns']
) {
  const formattedData = prepareDataForExport(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Ensure the filename ends with .xlsx
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Exports multiple sheets of data to a single Excel (.xlsx) file
 * 
 * @param filename Name of the file (should include .xlsx extension)
 * @param sheets Array of sheet definitions
 */
export function exportWorkbook(filename: string, sheets: ExportSheetDef[]) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const formattedData = prepareDataForExport(sheet.data, sheet.columns);
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  });

  // Ensure the filename ends with .xlsx
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
}
