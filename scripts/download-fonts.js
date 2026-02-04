/**
 * Noto Sans KR 폰트 파일 다운로드 스크립트
 * 
 * 사용법:
 *   node scripts/download-fonts.js
 * 
 * 이 스크립트는 public/fonts/ 디렉토리에 NotoSansKR-Regular.ttf와 NotoSansKR-Bold.ttf를 다운로드합니다.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
const fonts = [
  {
    name: 'NotoSansKR-Regular.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf'
  },
  {
    name: 'NotoSansKR-Bold.ttf',
    url: 'https://github.com/google/fonts/raw/main/ofl/notosanskr/static/NotoSansKR-Bold.ttf'
  }
];

// 폰트 디렉토리 생성
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log(`✓ Created directory: ${fontsDir}`);
}

// 폰트 다운로드 함수
function downloadFont(font) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(fontsDir, font.name);
    
    // 이미 파일이 있으면 스킵
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${font.name} (already exists)`);
      resolve();
      return;
    }
    
    console.log(`⬇️  Downloading ${font.name}...`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(font.url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded ${font.name}`);
          resolve();
        });
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // 리다이렉트 처리
        file.close();
        fs.unlinkSync(filePath);
        downloadFont({ ...font, url: response.headers.location }).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filePath);
        reject(new Error(`Failed to download ${font.name}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
  });
}

// 모든 폰트 다운로드
async function downloadAllFonts() {
  console.log('📥 Starting font download...\n');
  
  try {
    for (const font of fonts) {
      await downloadFont(font);
    }
    console.log('\n✅ All fonts downloaded successfully!');
    console.log(`📁 Fonts are located at: ${fontsDir}`);
  } catch (error) {
    console.error('\n❌ Error downloading fonts:', error.message);
    console.error('\n💡 Manual download:');
    console.error('   1. Visit https://fonts.google.com/noto/specimen/Noto+Sans+KR');
    console.error('   2. Download the font files');
    console.error(`   3. Place them in: ${fontsDir}`);
    process.exit(1);
  }
}

downloadAllFonts();
