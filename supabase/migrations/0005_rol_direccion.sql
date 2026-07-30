-- Agrega el rol "direccion" (solo lectura de todo el consultorio).
-- Se separa en su propia migración porque Postgres no permite usar un
-- nuevo valor de enum en la misma transacción en la que se lo agrega.

alter type user_role add value if not exists 'direccion';
