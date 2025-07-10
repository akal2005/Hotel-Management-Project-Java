# Hotel-Management-Project-Java

This Hotel Management System is a Java-based console application designed to efficiently handle 
common hotel operations such as booking and unbooking rooms (across four different room types), 
storing customer details, ordering food for specific rooms, and generating bills. Users can also
check room features and availability. The application is menu-driven and runs in a loop until the
user exits. It uses file handling to save the hotel’s current state (booked rooms, food orders,
customer data) so that nothing is lost when the program restarts. On exit, data is written to a 
file using a separate thread to ensure smooth and responsive performance. When the program starts again,
it loads the previous data from the file. A user-defined exception is used to prevent booking of already occupied rooms,
and proper exception handling is implemented to manage any runtime issues smoothly. This project is a practical demonstration of Java programming concepts in a real-world scenario.

##### Topics Covered-  
Classes and Objects, Inheritance, File Handling with Objects, ArrayList, implementing
Interface, User defined exception and Exception handling.
