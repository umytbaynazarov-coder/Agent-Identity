-- Give the test agent admin permissions
UPDATE agents SET permissions = '{*:*:*}' WHERE agent_id = 'agt_739ea11ff534df2d0c9b834821fc337b';
