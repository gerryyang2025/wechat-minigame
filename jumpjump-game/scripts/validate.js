const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const projectConfigPath = path.join(projectRoot, 'project.config.json');
const targetExtensions = new Set(['.js', '.json', '.md']);
const assetExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.wav', '.mp3', '.m4a', '.aac', '.ogg']);
const ignoredDirectories = new Set(['.git', 'node_modules']);
const maxAssetBytes = 200 * 1024;
const nearLimitAssetBytes = 180 * 1024;
const packIgnoreRules = loadPackIgnoreRules();

const files = [];
let hasFailure = false;
const nearLimitAssets = [];
let largestAsset = null;

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function loadPackIgnoreRules() {
  try {
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    const rules = projectConfig && projectConfig.packOptions && Array.isArray(projectConfig.packOptions.ignore)
      ? projectConfig.packOptions.ignore
      : [];

    return rules
      .filter(function (rule) {
        return rule && typeof rule.type === 'string' && typeof rule.value === 'string';
      })
      .map(function (rule) {
        return {
          type: rule.type,
          value: normalizeRelativePath(rule.value)
        };
      });
  } catch (error) {
    return [];
  }
}

function shouldIgnore(relativePath) {
  const normalizedPath = normalizeRelativePath(relativePath);

  return packIgnoreRules.some(function (rule) {
    if (rule.type === 'file') {
      return normalizedPath === rule.value;
    }

    if (rule.type === 'folder') {
      return normalizedPath === rule.value || normalizedPath.startsWith(rule.value + '/');
    }

    if (rule.type === 'suffix') {
      return normalizedPath.endsWith(rule.value);
    }

    if (rule.type === 'prefix') {
      return normalizedPath.startsWith(rule.value);
    }

    return false;
  });
}

function walk(directory) {
  fs.readdirSync(directory, { withFileTypes: true })
    .sort(function (a, b) {
      return a.name.localeCompare(b.name);
    })
    .forEach(function (entry) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = normalizeRelativePath(path.relative(projectRoot, fullPath));

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name) && !shouldIgnore(relativePath)) {
          walk(fullPath);
        }
        return;
      }

      if (shouldIgnore(relativePath)) {
        return;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (targetExtensions.has(extension) || assetExtensions.has(extension)) {
        files.push(fullPath);
      }
    });
}

function validateJavaScript(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  new vm.Script(source, { filename: filePath });
}

function validateJson(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  JSON.parse(source);
}

function validateAssetSize(filePath) {
  const stats = fs.statSync(filePath);

  if (!largestAsset || stats.size > largestAsset.size) {
    largestAsset = {
      path: filePath,
      size: stats.size
    };
  }

  if (stats.size > maxAssetBytes) {
    throw new Error('Asset exceeds 200 KiB: ' + stats.size + ' bytes');
  }

  if (stats.size >= nearLimitAssetBytes) {
    nearLimitAssets.push({
      path: filePath,
      size: stats.size
    });
  }
}

function validateFile(filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  const extension = path.extname(filePath).toLowerCase();

  try {
    if (extension === '.js') {
      validateJavaScript(filePath);
    } else if (extension === '.json') {
      validateJson(filePath);
    } else if (assetExtensions.has(extension)) {
      validateAssetSize(filePath);
    }

    console.log('OK   ' + relativePath);
  } catch (error) {
    hasFailure = true;
    console.error('FAIL ' + relativePath);
    console.error(String(error.message || error));
  }
}

walk(projectRoot);
files.forEach(validateFile);

if (hasFailure) {
  console.error('\nValidation failed.');
  process.exit(1);
}

if (largestAsset) {
  console.log(
    '\nLargest asset: ' +
    path.relative(projectRoot, largestAsset.path) +
    ' (' +
    largestAsset.size +
    ' bytes)'
  );
}

if (nearLimitAssets.length) {
  console.warn('\nWarning: assets near the 200 KiB limit:');
  nearLimitAssets
    .sort(function (a, b) {
      return b.size - a.size;
    })
    .forEach(function (asset) {
      console.warn(
        '- ' +
        path.relative(projectRoot, asset.path) +
        ' (' +
        asset.size +
        ' bytes)'
      );
    });
}

console.log('\nValidated ' + files.length + ' files successfully.');
