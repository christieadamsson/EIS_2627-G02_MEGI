<?php
// DAL - single shared PDO connection (singleton).
// Requires config/config.php to be loaded first (DB_* constants).

class Database
{
    private static ?PDO $pdo = null;

    private function __construct() {}

    public static function get(): PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);
            self::$pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,   // real prepared statements
            ]);
        }
        return self::$pdo;
    }

    /**
     * Runs $work inside ONE transaction: everything is saved, or nothing is.
     * Lets the BLL group several repository calls without writing SQL itself.
     */
    public static function transaction(callable $work): mixed
    {
        $pdo = self::get();
        $pdo->beginTransaction();
        try {
            $result = $work();
            $pdo->commit();
            return $result;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
