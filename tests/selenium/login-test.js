const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');
const path = require('path');

const options = new chrome.Options();

const CHROMEDRIVER_PATH = path.join(__dirname, '../../drivers/chromedriver.exe');
const service = new chrome.ServiceBuilder(CHROMEDRIVER_PATH);

async function testLoginForm() {
    console.log('Starting login test with Selenium WebDriver');
    let driver;

    try {
        require('../../app.js');

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .setChromeService(service)
            .build();
        
        await driver.get('http://localhost:3000');
        console.log('Navigated to application');

        await driver.findElement(By.id('showLoginForm')).click();
        
        await driver.wait(until.elementLocated(By.id('loginForm')), 5000);
        
        console.log('Testing invalid login...');
        await driver.findElement(By.id('login_email')).sendKeys('wrong@example.com');
        await driver.findElement(By.id('login_password')).sendKeys('WrongPass');
        await driver.findElement(By.id('loginForm')).submit();
        
        const errorMessage = await driver.wait(until.elementLocated(By.id('loginMessage')), 5000);
        await driver.wait(until.elementIsVisible(errorMessage), 5000);
        const errorText = await errorMessage.getText();
        assert.strictEqual(errorText, "Invalid email or password");
        console.log('✓ Error message displayed correctly for invalid credentials');
        
        await driver.findElement(By.id('login_email')).clear();
        await driver.findElement(By.id('login_password')).clear();
        
        // Shine hereglegc uusgeh
        console.log('Creating test account...');
        const timestamp = Date.now();
        const testEmail = `test_${timestamp}_${Math.floor(Math.random() * 1000)}@example.com`;
        const testPhone = `9988${timestamp.toString().slice(-4)}`;
        const testPassword = 'Test123!';
        
        // reg luu butsnsa
        await driver.findElement(By.id('showRegisterForm')).click();
        await driver.wait(until.elementLocated(By.id('registerForm')), 5000);
        
        // Fill reg form
        await driver.findElement(By.id('email')).sendKeys(testEmail);
        await driver.findElement(By.id('password')).sendKeys(testPassword);
        await driver.findElement(By.id('father_name')).sendKeys('TestFather');
        await driver.findElement(By.id('first_name')).sendKeys('TestUser');
        await driver.findElement(By.id('address')).sendKeys('Test Address');
        await driver.findElement(By.id('phone')).sendKeys(testPhone);
        await driver.findElement(By.id('registerForm')).submit();
        
        const regMessage = await driver.wait(until.elementLocated(By.id('registerMessage')), 5000);
        await driver.wait(until.elementIsVisible(regMessage), 5000);
        console.log('✓ Successfully registered test user');
        
        // Switch back to login form
        await driver.findElement(By.id('showLoginForm')).click();
        await driver.wait(until.elementLocated(By.id('loginForm')), 5000);
        
        console.log('Testing valid login...');
        await driver.findElement(By.id('login_email')).sendKeys(testEmail);
        await driver.findElement(By.id('login_password')).sendKeys(testPassword);
        await driver.findElement(By.id('loginForm')).submit();
        
        await driver.wait(until.elementLocated(By.css('.user-profile')), 5000);
        
        const addressValueElement = await driver.wait(
            until.elementLocated(By.xpath("//div[contains(@class, 'profile-row')]/span[@class='label'][contains(text(), 'Address:')]/following-sibling::span[@class='value']")),
            5000
        );
        const displayedAddress = await addressValueElement.getText();
        assert.strictEqual(displayedAddress, 'Test Address');
        console.log('✓ User information displayed correctly after login');

        console.log('All login tests PASSED successfully!');
        
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    } finally {
        if (driver) {
            await driver.quit();
            console.log('WebDriver session closed');
        }
        process.exit();
    }
}

testLoginForm().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});