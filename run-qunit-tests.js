const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('file://' + path.join(__dirname, 'test.html'), { waitUntil: 'networkidle0' });

  const testResult = await page.evaluate(() => {
    const qunitDetails = document.getElementById('qunit-testresult');
    if (!qunitDetails) {
      return { error: 'QUnit test result element not found.' };
    }
    const failed = qunitDetails.querySelector('.failed');
    const passed = qunitDetails.querySelector('.passed');
    const total = qunitDetails.querySelector('.total');

    return {
      failed: failed ? parseInt(failed.innerText) : 0,
      passed: passed ? parseInt(passed.innerText) : 0,
      total: total ? parseInt(total.innerText) : 0,
      details: qunitDetails.innerText
    };
  });

  console.log('Test Results:', testResult);

  if (testResult.error) {
    console.error('Error running tests:', testResult.error);
    process.exitCode = 1;
  } else if (testResult.failed > 0) {
    console.error(`${testResult.failed} of ${testResult.total} tests failed.`);
    const testSummary = await page.evaluate(() => {
        let summary = '';
        const tests = document.querySelectorAll('#qunit-tests > li');
        tests.forEach(test => {
            const testName = test.querySelector('.test-name').innerText;
            const result = test.className; // 'pass' or 'fail'
            summary += `Test: ${testName} - ${result.toUpperCase()}\n`;
            if (result === 'fail') {
                const assertions = test.querySelectorAll('.test-message');
                assertions.forEach(assertion => {
                    summary += `  Assertion: ${assertion.innerText}\n`;
                });
            }
        });
        return summary;
    });
    console.error('Failed tests details:\n', testSummary);
    process.exitCode = 1;
  } else {
    console.log(`All ${testResult.passed} tests passed!`);
  }

  await browser.close();
})();
