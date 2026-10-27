import java.sql.SQLException;
import java.util.Scanner;

public class TestUserDAO {
    public static void main(String[] args) {
        try (Scanner scanner = new Scanner(System.in)) {
            System.out.print("MySQL username: ");
            String username = scanner.nextLine();

            System.out.print("MySQL password: ");
            String password = scanner.nextLine();

            String email = "test." + System.currentTimeMillis()
                    + "@example.com";

            // Placeholder only: not a real password hash.
            // Authentication will be added after secure hashing.
            User testUser = new User(
                    "SpendWise Test User",
                    email,
                    "TEST_ONLY_NOT_A_REAL_HASH",
                    "STUDENT"
            );

            UserDAO dao = new UserDAO();
            int newId = dao.createUser(testUser);

            System.out.println("Test user inserted successfully!");
            System.out.println("Generated user ID: " + newId);
            System.out.println("Test email: " + email);
        } catch (SQLException e) {
            System.out.println("Insert failed: " + e.getMessage());
        }
    }
}
