Feature: User Authentication
  As a user
  I want to register and login to the system
  So that I can access my personal information

  Scenario: User registration with valid data
    Given the server is running
    When I register with the following details:
      | email        | password | father_name | first_name | address     | phone        |
      | UNIQUE_EMAIL | Test123! | Батын       | Болд       | Улаанбаатар | UNIQUE_PHONE |
    Then I should receive a successful registration message
    And my data should be stored encrypted in the database

  Scenario: User login with valid credentials
    Given the server is running
    And I register with the following details:
      | email        | password | father_name | first_name | address     | phone        |
      | UNIQUE_EMAIL | Test123! | Батын       | Болд       | Улаанбаатар | UNIQUE_PHONE |
    When I login with email "UNIQUE_EMAIL" and password "Test123!"
    Then I should be successfully logged in
    And I should see my decrypted personal information
    And I should see my address "Улаанбаатар" in my profile

  Scenario: User login with invalid credentials
    Given the server is running
    When I login with email "wrong@example.com" and password "WrongPass"
    Then I should see an error message "Invalid email or password" 