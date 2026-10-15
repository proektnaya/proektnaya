/**
 * ПРОЕКТНАЯ — телеметрия для Google Apps Script
 * Лог визитов и статистика лежат в этом же Google-таблице (лист "visits").
 * Пароли проверяются здесь, на сервере Google.
 *
 * Установка (5 минут):
 * 1. sheets.new — создать таблицу, назвать, например «Проектная телеметрия».
 * 2. Расширения → Apps Script → удалить всё → вставить этот код → Сохранить.
 * 3. Развернуть → Новое развертывание → Тип: «Веб-приложение»
 *    • Выполнять: я (Саша/ты)
 *    • Кто с доступом: «Все»
 * 4. Скопировать URL вида https://script.google.com/macros/s/XXXX/exec
 *    и вписать его в fx.js и stats.html (переменная GAS_URL).
 */

var PASSWORDS = {
  adminer: 'full',   // полный доступ
  adinir:  'full',   // полный доступ
  adman:   'today'   // только гости сегодня
};

function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

/* Google сам добавляет Access-Control-Allow-Origin: * для GET,
   так что страница читает статистику через fetch без JSONP */
function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function handle(e) {
  var p = (e && e.parameter) || {};
  var task = p.task || 'log';

  if (task === 'log') {
    sheet().appendRow([
      new Date().toISOString(),
      (p.ip || '?').slice(0, 45),
      (p.device || '?').slice(0, 60),
      (p.os || '?').slice(0, 20),
      (p.browser || '?').slice(0, 20),
      (p.path || '/').slice(0, 80)
    ]);
    return out(p, { ok: true });
  }

  if (task === 'stats') {
    var level = PASSWORDS[p.pass];
    if (!level) return out(p, { error: 'неверный пароль' });

    var sh = sheet();
    var last = sh.getLastRow();
    var visits = [];
    if (last > 1) {
      var rows = sh.getRange(2, 1, last - 1, 6).getValues();
      for (var i = 0; i < rows.length; i++) {
        visits.push({
          date: rows[i][0],
          ts: new Date(rows[i][0]).getTime() || 0,
          ip: rows[i][1],
          device: rows[i][2],
          os: rows[i][3],
          browser: rows[i][4],
          path: rows[i][5]
        });
      }
    }
    visits.sort(function (a, b) { return b.ts - a.ts; });

    if (level === 'today') {
      var d0 = new Date(); d0.setHours(0, 0, 0, 0);
      visits = visits.filter(function (v) { return v.ts >= d0.getTime(); });
    }
    return out(p, { level: level, visits: visits });
  }

  return out(p, { error: 'unknown task' });
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('visits');
  if (!sh) {
    sh = ss.insertSheet('visits');
    sh.appendRow(['date', 'ip', 'device', 'os', 'browser', 'path']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Ответ: JSON, а если пришёл callback — JSONP (script-тег).
   JSONP работает всегда, даже когда браузер блокирует чтение из-за CORS */
function out(p, obj) {
  var json = JSON.stringify(obj);
  if (p.callback && /^[\w$]+$/.test(p.callback)) {
    return ContentService
      .createTextOutput(p.callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
