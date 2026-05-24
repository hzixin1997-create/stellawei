-- 统计近 X 分钟内登录过的用户（在线用户近似）
CREATE OR REPLACE FUNCTION count_online_users(since timestamp with time zone)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result bigint;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM auth.users
  WHERE last_sign_in_at >= since;
  
  RETURN count_result;
END;
$$;

-- 给 service_role 授权执行
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION count_online_users(timestamp with time zone) TO authenticated;
