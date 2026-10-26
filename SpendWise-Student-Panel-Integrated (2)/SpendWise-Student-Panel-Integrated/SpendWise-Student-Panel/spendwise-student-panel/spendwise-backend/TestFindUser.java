import java.sql.SQLException;
import java.util.Scanner;

public class TestFindUser {
    public static void main(String[] args) {
        try (Scanner scanner = new Scanner(System.in)) {
            System.out.print("MySQL username: ");
            String username = scanner.nextLine();

            System.out.print("MySQL password: ");
            String password = scanner.nextLine();

            System.out.print("Email of the test user: ");
            String email = scanner.nextLine();

            UserDAO dao = new UserDAO();
            User user = dao.findUserByEmail(email);

            if (user == null) {
                System.out.println("No user found with that email.");
            } else {
                System.out.println("User found successfully!");
                System.out.println("ID: " + user.getId());
                System.out.println("Name: " + user.getFullName());
                System.out.println("Email: " + user.getEmail());
                System.out.println("Role: " + user.getRole());
            }
        } catch (SQLException e) {
            System.out.println("Database query failed: " + e.getMessage());
        }
    }
}
