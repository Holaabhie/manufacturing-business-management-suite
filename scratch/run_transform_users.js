const fs = require('fs');

const file = 'apps/web/src/app/dashboard/users/page.tsx';
let original = fs.readFileSync(file, 'utf8');
const isCrlf = original.includes('\r\n');
let code = original.replace(/\r\n/g, '\n');

// Read transform script content
const transformScript = fs.readFileSync('scratch/transform_users_page.js', 'utf8').replace(/\r\n/g, '\n');

let matchCount = 0;
let failCount = 0;
const failedPatterns = [];

const safeReplace = (target, replacement) => {
  if (typeof target === 'string') {
    if (!code.includes(target)) {
      failCount++;
      failedPatterns.push(target.slice(0, 100));
      return code;
    }
    matchCount++;
    return code.replace(target, replacement);
  } else if (target instanceof RegExp) {
    if (!target.test(code)) {
      failCount++;
      failedPatterns.push(target.toString().slice(0, 100));
      return code;
    }
    matchCount++;
    return code.replace(target, replacement);
  }
  return code;
};

// Now let's adapt transform_users_page.js by replacing `code = code.replace(` with `code = safeReplace(`
let runnableScript = transformScript
  .replace(/let code = fs\.readFileSync\(file, ['"]utf8['"]\);/, '// code already read')
  .replace(/fs\.writeFileSync\(file, code, ['"]utf8['"]\);/, '// write handled outside')
  .replace(/code = code\.replace\(/g, 'code = safeReplace(');

// Evaluate inside function
const runFn = new Function('code', 'safeReplace', 'console', 'require', runnableScript + '\nreturn code;');
const transformedCode = runFn(code, safeReplace, console, require);

console.log(`\n--- Transformation Results ---`);
console.log(`Successful replacements: ${matchCount}`);
console.log(`Failed replacements: ${failCount}`);
if (failedPatterns.length > 0) {
  console.log(`Failed samples:\n`, JSON.stringify(failedPatterns, null, 2));
}

if (failCount === 0) {
  const finalCode = isCrlf ? transformedCode.replace(/\n/g, '\r\n') : transformedCode;
  fs.writeFileSync(file, finalCode, 'utf8');
  console.log(`\nSuccessfully wrote transformed code to ${file}!`);
} else {
  console.log('\nAborted writing due to failed replacements. Please inspect failed patterns.');
}
