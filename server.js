const express = require('express');
const fs = require('fs');
const path = require('path');
const cache = require('memory-cache');
const cron = require('node-cron'); // 크론 작업 라이브러리 (캐시 갱신을 위한)
const app = express();

// JSON 파일 경로
const jsonFiles = {
  npc: 'assets/npc.json',
  spawnlist: 'assets/spawnlist.json',
  mapids: 'assets/mapids.json',
  shop: 'assets/shop.json',
  spawnlist_npc: 'assets/spawnlist_npc.json',
  armor: 'assets/armor.json',
  weapon: 'assets/weapon.json',
  expitem: 'assets/expitem.json',
  etcitem: 'assets/etcitem.json',
  droplist_boss: 'assets/droplist_boss.json',
  droplist: 'assets/droplist.json',
  event_boss_time: 'assets/event_boss_time.json'
};


// 정적 파일 제공: /public 폴더 안의 파일들
app.use(express.static(path.join(__dirname, 'public')));

// 정적 파일 제공: /assets 폴더 안의 파일들
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// JSON 데이터 로딩 함수
const loadJson = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, filePath), 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
};

// 모든 JSON 데이터를 한 번에 불러오는 API
app.get('/assets', async (req, res) => {
  // 캐시된 데이터가 있으면 캐시된 데이터 반환
  const cachedData = cache.get('dassets');
  if (cachedData) {
    return res.json(cachedData); // 캐시된 데이터 반환
  }

  try {
    const data = {};
    for (const [key, filePath] of Object.entries(jsonFiles)) {
      data[key] = await loadJson(filePath);
    }

    // 데이터를 캐시로 저장 (30분 동안 캐시)
    cache.put('data', data, 30 * 60 * 1000); // 30분 동안 캐시

    // 클라이언트에게 데이터를 반환하고, 30분 동안 캐시되도록 Cache-Control 헤더 추가
    res.setHeader('Cache-Control', 'public, max-age=1800'); // 30분 동안 캐시
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// 서버 실행
//app.listen(3000, () => {
//  console.log('Server running on http://localhost:3000');
//});

// 서버 실행
const PORT = process.env.PORT || 3000;  // 환경 변수 PORT가 있으면 그 포트, 없으면 3000번 사용
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 매일 자정에 캐시를 갱신하는 작업 (크론 작업)
cron.schedule('0 0 * * *', () => {
  cache.del('data'); // 캐시 삭제
  console.log('캐시가 갱신되었습니다.');
});

// 파일 변경 시 캐시 갱신
fs.watch(path.join(__dirname, 'assets'), (eventType, filename) => {
  if (filename && eventType === 'change') {
    // 파일이 변경되면 캐시 삭제
    cache.del('data');
    console.log(`${filename} 파일이 변경되어 캐시가 갱신되었습니다.`);
  }
});
