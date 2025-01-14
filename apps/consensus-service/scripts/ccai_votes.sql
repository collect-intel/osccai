SELECT 
    p.uid AS participant_id,
    s.uid AS statement_id,
    COALESCE(v."voteValue", NULL) AS vote_value
FROM 
    public."Participant" p
CROSS JOIN 
    public."Statement" s
LEFT JOIN 
    public."Vote" v ON p.uid = v."participantId" AND s.uid = v."statementId"
WHERE 
    s."pollId" = (SELECT uid FROM public."Poll" WHERE "communityModelId" = (SELECT uid FROM public."CommunityModel" WHERE name = 'Original CCAI') LIMIT 1)
ORDER BY 
    p.uid, s.uid;