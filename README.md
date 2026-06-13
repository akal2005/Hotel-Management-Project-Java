# Hotel Management System (Java Spring Boot & React)

A premium, full-stack Hotel Management System (HMS) built with a modern **Java Spring Boot** backend and an interactive **React** frontend. 

The entire application runs as a unified service on port `5000` and can be launched directly from Eclipse.

---

## 🛠️ Technology Stack
- **Backend**: Java 17, Spring Boot 3.5.0 (Spring Web, Spring Security, Spring Data JPA)
- **Token Security**: JJWT (Java JWT) for stateless session tokens and rotating refresh tokens
- **Frontend**: React (Vite), Axios for API requests, Vanilla CSS design system
- **Database**: MySQL 8.x

---

## ⚠️ Current Problems Faced by Hotels

The hotel industry faces several operational and management challenges that affect efficiency, customer satisfaction, and profitability. Many hotels still rely on manual processes or outdated systems, leading to delays, errors, and poor resource management.

### Key Problems
1. **Manual Reservation Management**
   - Many hotels handle bookings manually, which can result in double bookings, booking errors, and difficulty tracking room availability.
2. **Inefficient Check-in and Check-out Process**
   - Traditional check-in and check-out procedures are time-consuming and may cause long waiting times for guests.
3. **Poor Room Management**
   - Tracking room status, maintenance schedules, and housekeeping activities manually can lead to confusion and reduced operational efficiency.
4. **Customer Data Management Issues**
   - Hotels often struggle to maintain guest records, preferences, booking history, and feedback in an organized manner.
5. **Billing and Payment Errors**
   - Manual billing processes can result in calculation mistakes, delayed payments, and inaccurate financial records.
6. **Lack of Real-Time Information**
   - Managers may not have access to real-time occupancy rates, revenue reports, or room availability, making decision-making difficult.
7. **Inventory Management Challenges**
   - Monitoring hotel supplies such as food, beverages, toiletries, and housekeeping materials manually can lead to shortages or wastage.
8. **Staff Coordination Problems**
   - Communication gaps between reception, housekeeping, maintenance, and management departments can reduce service quality.
9. **Security and Data Protection Concerns**
   - Paper-based records and unsecured systems increase the risk of data loss, unauthorized access, and privacy violations.
10. **Customer Satisfaction Issues**
    - Delays in service, booking errors, and poor communication can negatively impact guest experiences and online reviews.

---

## 💻 Running the Project in Eclipse

### 1. Import Project
1. Open **Eclipse IDE**.
2. Click **File** ➔ **Import...**
3. Select **Maven** ➔ **Existing Maven Projects** and click **Next**.
4. Browse and select the project directory: `C:\Users\raahu\Downloads\files`
5. Click **Finish** and wait for Eclipse to build the workspace.

### 2. Run the Application
1. In the left panel, expand `src/main/java` ➔ `com.hotelms`.
2. Double-click `HotelmsApplication.java` to open it.
3. Right-click anywhere in the file and select **Run As** ➔ **Java Application**.
4. Open Google Chrome and go to: **`http://localhost:5000/`**
