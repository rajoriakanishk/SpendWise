import java.io.Console;
import java.sql.SQLException;
import java.util.Scanner;
import org.mindrot.jbcrypt.BCrypt;

/** One-time utility for creating an administrator login. */
public class CreateAdmin {
    public static void main(String[] args) {
        Console console = System.console();
        Scanner scanner = console == null ? new Scanner(System.in) : null;
        try {
            String name = prompt(console, scanner, "Administrator full name: ", false);
            String email = prompt(console, scanner, "Administrator email: ", false);
            String password;
            String confirm;
            do {
                password = prompt(console, scanner, "Password (at least 8 characters): ", true);
                confirm = prompt(console, scanner, "Confirm password: ", true);
                if (!password.equals(confirm)) System.out.println("Passwords did not match. Try again.");
            } while (!password.equals(confirm));
            if (password.length() < 8) throw new IllegalArgumentException("Password must be at least 8 characters.");
            UserDAO dao = new UserDAO();
            if (dao.findUserByEmail(email.trim()) != null) {
                throw new IllegalArgumentException("That email already exists. Use an existing ADMIN account or choose another email.");
            }
            User admin = new User(name.trim(), email.trim().toLowerCase(java.util.Locale.ROOT),
                    BCrypt.hashpw(password, BCrypt.gensalt(12)), "ADMIN");
            int id = dao.createUser(admin);
            System.out.println("Administrator created successfully. User ID: " + id);
        } catch (SQLException | IllegalArgumentException e) {
            System.err.println("Could not create administrator: " + e.getMessage());
            System.exit(1);
        }
    }

    private static String prompt(Console console, Scanner scanner, String label, boolean secret) {
        if (console != null) {
            char[] value = secret ? console.readPassword("%s", label) : console.readLine("%s", label).toCharArray();
            return new String(value);
        }
        System.out.print(label);
        return scanner.nextLine();
    }
}
