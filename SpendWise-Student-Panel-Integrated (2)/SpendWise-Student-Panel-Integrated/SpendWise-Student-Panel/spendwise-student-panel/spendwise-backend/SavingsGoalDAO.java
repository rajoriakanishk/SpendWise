import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class SavingsGoalDAO {

    public static class SavingsGoal {
        public int id;
        public String name;
        public BigDecimal target;
        public BigDecimal saved;
        public String icon;
        public String date;

        public SavingsGoal(
                int id,
                String name,
                BigDecimal target,
                BigDecimal saved,
                String icon,
                String date) {
            this.id = id;
            this.name = name;
            this.target = target;
            this.saved = saved;
            this.icon = icon;
            this.date = date;
        }
    }

    public List<SavingsGoal> getGoals(int userId) throws SQLException {
        String sql = """
                SELECT id, name, target_amount, saved_amount, icon, target_date
                FROM savings_goals
                WHERE user_id = ?
                ORDER BY id
                """;

        List<SavingsGoal> goals = new ArrayList<>();

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);

            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    Date targetDate = result.getDate("target_date");

                    goals.add(new SavingsGoal(
                            result.getInt("id"),
                            result.getString("name"),
                            result.getBigDecimal("target_amount"),
                            result.getBigDecimal("saved_amount"),
                            result.getString("icon"),
                            targetDate == null ? "" : targetDate.toString()
                    ));
                }
            }
        }

        return goals;
    }

    public int createGoal(
            int userId,
            String name,
            BigDecimal target,
            BigDecimal saved,
            String icon,
            String date) throws SQLException {

        String sql = """
                INSERT INTO savings_goals
                    (user_id, name, target_amount, saved_amount, icon, target_date)
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     sql, PreparedStatement.RETURN_GENERATED_KEYS)) {

            statement.setInt(1, userId);
            statement.setString(2, name);
            statement.setBigDecimal(3, target);
            statement.setBigDecimal(4, saved);
            statement.setString(5, icon);

            if (date == null || date.isBlank()) {
                statement.setNull(6, java.sql.Types.DATE);
            } else {
                statement.setDate(6, Date.valueOf(date));
            }

            statement.executeUpdate();

            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getInt(1);
                }
            }
        }

        throw new SQLException("Could not create savings goal.");
    }

    public boolean updateGoal(
            int userId,
            int goalId,
            String name,
            BigDecimal target,
            BigDecimal saved,
            String icon,
            String date) throws SQLException {

        String sql = """
                UPDATE savings_goals
                SET name = ?, target_amount = ?, saved_amount = ?,
                    icon = ?, target_date = ?
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, name);
            statement.setBigDecimal(2, target);
            statement.setBigDecimal(3, saved);
            statement.setString(4, icon);

            if (date == null || date.isBlank()) {
                statement.setNull(5, java.sql.Types.DATE);
            } else {
                statement.setDate(5, Date.valueOf(date));
            }

            statement.setInt(6, goalId);
            statement.setInt(7, userId);

            return statement.executeUpdate() > 0;
        }
    }

    public boolean deleteGoal(int userId, int goalId) throws SQLException {
        String sql = """
                DELETE FROM savings_goals
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, goalId);
            statement.setInt(2, userId);

            return statement.executeUpdate() > 0;
        }
    }

    public boolean addSavings(
            int userId,
            int goalId,
            BigDecimal amount) throws SQLException {

        String sql = """
                UPDATE savings_goals
                SET saved_amount = saved_amount + ?
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setBigDecimal(1, amount);
            statement.setInt(2, goalId);
            statement.setInt(3, userId);

            return statement.executeUpdate() > 0;
        }
    }
}
